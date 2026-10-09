'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { once } = require('node:events');
const { createApp } = require('../server/index.cjs');
const { domain, emptyData } = require('../server/domain.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'inkajus-server-test-'));
const database = path.join(directory, 'test.sqlite');
const password = 'Solo-pruebas-9827-local';
let app, base, cookie = '', revision = 0, checks = 0;

async function boot() {
  app = createApp({ database, production: false });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  base = `http://127.0.0.1:${app.server.address().port}`;
}
async function stop() { await new Promise(resolve => app.server.close(resolve)); }
async function request(route, payload, auth = cookie, origin = base) {
  const response = await fetch(base + route, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: { ...(auth ? { Cookie: auth } : {}), ...(payload === undefined ? {} : { 'Content-Type': 'application/json', 'X-Inkajus-Request': '1', Origin: origin }) },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data, headers: response.headers };
}
async function check(label, run) { await run(); checks += 1; console.log('OK ' + label); }
async function command(name, args, auth = cookie, expected = revision) {
  const result = await request('/api/command', { command: name, args, revision: expected }, auth);
  if (auth === cookie && result.data.revision !== undefined) revision = result.data.revision;
  return result;
}

(async () => {
  await boot();
  await check('instalación vacía sin credenciales ni registros de prueba', async () => {
    const result = await request('/api/session');
    assert.equal(result.data.setupRequired, true); assert.equal(result.data.data, null);
    assert.equal(app.store.read().users.length, 0);
  });
  await check('origen ajeno y contraseña insuficiente se rechazan', async () => {
    assert.equal((await request('/api/setup', { password }, '', 'https://ajeno.example')).status, 403);
    assert.equal((await request('/api/setup', { password: 'corta' })).status, 400);
    assert.equal(app.store.initialized(), false);
  });
  await check('alta exclusiva de Lincoln, configuración conservada y equipo vacío', async () => {
    const config = emptyData().settings; config.payDay = 15;
    config.types.push({ id: 'custom-bonus', label: 'Bono personalizado', nature: 'income', active: true });
    const result = await request('/api/setup', { password, settings: config, users: [{ username: 'injected' }] });
    assert.equal(result.status, 201); cookie = result.headers.get('set-cookie').split(';')[0]; revision = result.data.revision;
    assert.match(result.headers.get('set-cookie'), /HttpOnly/); assert.match(result.headers.get('set-cookie'), /SameSite=Strict/);
    assert.equal(result.data.user.username, 'cnlincoln'); assert.equal(result.data.user.fullName, 'Lincoln Cuellar Natividad');
    assert.equal(result.data.data.users.length, 1); assert.equal(result.data.data.settings.payDay, 15);
    assert(result.data.data.settings.types.some(t => t.id === 'custom-bonus'));
    for (const key of ['employees','movements','payments','events','periods']) assert.equal(result.data.data[key].length, 0);
    assert(!JSON.stringify(result.data).includes('passwordHash')); assert(!JSON.stringify(result.data).includes(password));
    assert.match(app.store.read().users[0].passwordHash, /^scrypt\$/); assert.equal(app.store.read().users[0].password, undefined);
    assert.equal((await request('/api/setup', { password })).status, 409);
  });
  await check('servidor no publica base de datos, configuración privada ni credenciales demo', async () => {
    for (const route of ['/storage/inkajus.sqlite','/server/index.cjs','/.env','/assets/js/data/demo-data.js','/assets/%2e%2e/server/index.cjs']) assert.equal((await request(route)).status, 404);
    const index = await request('/'); assert.equal(index.status, 200); assert(!index.data.includes('src="assets/js/data/demo-data.js"'));
    assert.equal((await request('/api/login', { username: 'admin', password: 'admin123' }, '')).status, 401);
    assert.equal((await command('payroll.prepare', ['2026-09'], '')).status, 401);
  });
  await check('acciones arbitrarias e inyección de estado protegida son rechazadas', async () => {
    assert.equal((await command('repo.transaction', [{}])).status, 400);
    assert.equal((await command('__proto__.test', [])).status, 400);
    assert.equal((await command('payroll.prepare', ['<invalid>'])).status, 400);
    assert.equal((await command('records.saveEvent', [{ start: '2026-02-31' }, null])).status, 400);
    const result = await command('records.saveCompany', [{ company: 'INKAJUS', payDay: 15, users: [], schemaVersion: 999 }]);
    assert.equal(result.status, 200); assert.equal(result.data.data.users.length, 1); assert.equal(result.data.data.schemaVersion, 1);
  });
  const today = domain(emptyData(), null).G.utils.today(), period = today.slice(0, 7);
  let employeeId, otherEmployeeId, paidMovement, visitorId, visitorCookie;
  await check('empleados se guardan y dos sesiones no sobreescriben la misma revisión', async () => {
    const employee = { fullName: 'Persona de integración', dni: '77777777', phone: '900000000', joined: today, birthDate: '', position: 'Prueba', salary: 1000, dayOff: 0, scheduleId: 'schedule-1', active: false, deletedAt: 'injected' };
    const result = await command('records.saveEmployee', [employee, null]); assert.equal(result.status, 200);
    employeeId = result.data.data.employees[0].id; assert.equal(result.data.data.employees[0].active, true); assert.equal(result.data.data.employees[0].deletedAt, undefined);
    const stale = revision;
    const results = await Promise.all([command('records.saveCompany', [{ company: 'INKAJUS', payDay: 20 }], cookie, stale), command('records.saveCompany', [{ company: 'INKAJUS', payDay: 21 }], cookie, stale)]);
    assert.deepEqual(results.map(r => r.status).sort(), [200,409]);
    revision = (await request('/api/session')).data.revision;
    const other = await command('records.saveEmployee', [{ ...employee, fullName: 'Otro trabajador', dni: '88888888' }, null]);
    assert.equal(other.status, 200); otherEmployeeId = other.data.data.employees.at(-1).id;
  });
  const movement = (typeId, amount, timing = 'pending') => ({ employeeId, typeId, amount, date: today, period, concept: 'Prueba de integración', notes: '', paymentTiming: timing, methodId: 'cash', settledAt: 'injected' });
  await check('liquidación y extras conservan las reglas financieras también por HTTP', async () => {
    let result = await command('records.addMovement', [movement('commission', 100)]); assert.equal(result.status, 200);
    paidMovement = result.data.data.movements.at(-1).id; assert.equal(result.data.data.movements.at(-1).settledAt, undefined);
    result = await command('payroll.addPayment', [{ employeeId, period, amount: 1100, date: today, methodId: 'cash' }]); assert.equal(result.status, 200);
    const receipt = structuredClone(result.data.data.payments[0]);
    assert.equal((await command('records.addMovement', [movement('bonus',80)])).status, 200);
    result = await command('records.voidRecord', ['movements', paidMovement, 'No debe anularse']); assert.equal(result.status, 400); assert.match(result.data.error, /liquidado/);
    result = await command('records.addMovement', [movement('bonus',20,'paid')]); assert.equal(result.status, 200);
    assert.deepEqual(result.data.data.payments[0], receipt);
    const own = result.data.data, G = domain(app.store.read(), result.data.user.id).G, calculation = G.payroll.calculate(employeeId, period);
    assert.equal(calculation.due, 1200); assert.equal(calculation.paid, 1120); assert.equal(calculation.remaining, 80);
    const linked = own.payments.at(-1); assert(linked.movementId);
    assert.equal((await command('records.voidRecord', ['payments', linked.id, 'No permitido'])).status, 400);
    assert.equal((await command('payroll.addPayment', [{ employeeId, period, amount: 80, date: today, methodId: 'cash' }])).status, 200);
  });
  await check('visitante solo recibe su perfil y no puede mutar ni escalar permisos', async () => {
    const result = await command('records.saveUser', [{ fullName: 'Visitante prueba', username: 'visitante', password, role: 'visitor', employeeId }, null]); assert.equal(result.status, 200);
    visitorId = result.data.data.users.find(u => u.username === 'visitante').id;
    const login = await request('/api/login', { username: 'visitante', password }, ''); assert.equal(login.status, 200);
    visitorCookie = login.headers.get('set-cookie').split(';')[0]; const own = login.data.data;
    assert.equal(own.employees.length, 1); assert.equal(own.employees[0].id, employeeId); assert.equal(own.users.length, 0); assert.equal(own.audit.length, 0);
    assert(!JSON.stringify(own).includes(otherEmployeeId)); assert(!JSON.stringify(own).includes('passwordHash'));
    assert.equal((await command('records.saveUser', [{ fullName: 'Escalada', username: 'escalada', password, role: 'admin' }, null], visitorCookie)).status, 403);
    assert.equal((await command('records.addMovement', [movement('bonus', 100)], visitorCookie)).status, 403);
  });
  await check('desactivar visitante revoca su acceso aunque conserve la cookie', async () => {
    assert.equal((await command('records.toggleUser', [visitorId])).status, 200);
    const result = await request('/api/session', undefined, visitorCookie); assert.equal(result.data.user, null); assert.equal(result.data.data, null);
  });
  await check('respaldo SQLite y reinicio conservan los datos sin repetir la instalación', async () => {
    const backup = path.join(directory, 'backup.sqlite'); await app.store.backup(backup); assert(fs.statSync(backup).size > 0);
    await stop(); await boot();
    const result = await request('/api/session'); assert.equal(result.data.setupRequired, false); assert.equal(result.data.user.username, 'cnlincoln'); revision = result.data.revision;
    const G = domain(app.store.read(), result.data.user.id).G; assert.equal(G.payroll.calculate(employeeId, period).remaining, 0);
    assert.equal((await command('records.voidRecord', ['movements', paidMovement, 'Después de reiniciar'])).status, 400);
  });
  await check('cambio de contraseña revoca sesiones anteriores y permite reingresar', async () => {
    const account = (await request('/api/session')).data.user;
    const result = await command('records.saveUser', [{ fullName: account.fullName, username: account.username, password: password + '-nueva', role: 'admin', employeeId: null }, account.id]);
    assert.equal(result.status, 200); assert.equal(result.data.user, null);
    assert.equal((await request('/api/login', { username: 'cnlincoln', password }, '')).status, 401);
    const login = await request('/api/login', { username: 'cnlincoln', password: password + '-nueva' }, ''); assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/logout', {})).status, 200); assert.equal((await request('/api/session')).data.user, null);
  });
  await check('adaptador de interfaz inicia sesión, guarda, exporta sin claves y cierra sesión por HTTP', async () => {
    const G = domain(app.store.read(), null).G;
    let browserCookie = '';
    const context = vm.createContext({ window: { GE: G }, location: { protocol: 'http:' }, structuredClone,
      fetch: async (route, options) => {
        const response = await fetch(base + route, { ...options, headers: { ...options.headers, Origin: base, Cookie: browserCookie } });
        const nextCookie = response.headers.get('set-cookie'); if (nextCookie) browserCookie = nextCookie.split(';')[0];
        return response;
      },
    });
    for (const file of ['data/server-adapter.js', 'services/export.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js', file), 'utf8'), context);
    await G.repo.init(); assert.equal(G.serverMode, true); assert.equal(G.auth.current(), null);
    await G.auth.login('cnlincoln', password + '-nueva'); assert.equal(G.auth.current().username, 'cnlincoln');
    await G.records.saveCompany({ company: 'INKAJUS', payDay: 25 }); assert.equal(G.repo.read().settings.payDay, 25);
    const exported = G.exports.prepare(); assert.equal(exported.credentialsIncluded, false); assert(!JSON.stringify(exported).includes('passwordHash'));
    await G.refresh(); assert.equal(G.repo.read().settings.payDay, 25);
    await G.auth.logout(); assert.equal(G.auth.current(), null); assert.throws(() => G.repo.read(), /Inicia sesión/);
  });
  console.log(`\n${checks} pruebas de integración del servidor correctas.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (app?.server.listening) await stop();
  const resolved = path.resolve(directory);
  if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('inkajus-server-test-')) fs.rmSync(resolved, { recursive: true, force: true });
});
