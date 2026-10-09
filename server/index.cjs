'use strict';

process.env.TZ ||= 'America/Lima';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Store } = require('./store.cjs');
const { domain, emptyData, safeUser } = require('./domain.cjs');
const { hashPassword, verifyPassword, tokenHash } = require('./security.cjs');
const { cleanCommand } = require('./commands.cjs');
const { settingsForSetup } = require('./setup.cjs');
const root = path.resolve(__dirname, '..');
const sessionMs = 8 * 60 * 60 * 1000;

function createApp(options = {}) {
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const origin = options.origin || process.env.APP_ORIGIN || '';
  const setupToken = options.setupToken || process.env.SETUP_TOKEN || '';
  const store = new Store(options.database || process.env.DATABASE_PATH || path.join(root, 'storage', 'inkajus.sqlite'));
  if (production && (!origin.startsWith('https://') || (!store.initialized() && !setupToken))) {
    store.close(); throw new Error('En producción configura APP_ORIGIN con HTTPS y SETUP_TOKEN para la primera instalación.');
  }
  const attempts = new Map();
  const tokenOf = req => (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('inkajus_session='))?.slice(16) || '';
  const sessionUser = req => {
    const session = store.session(tokenHash(tokenOf(req)));
    if (!session) return null;
    return domain(store.read(), session.user_id).G.auth.current();
  };
  const snapshot = user => ({ user, revision: store.revision(), data: user ? domain(store.read(), user.id).G.auth.data() : null });
  const cookie = (token, age = sessionMs / 1000) => `inkajus_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${production ? '; Secure' : ''}`;

  function json(res, status, body, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    res.end(JSON.stringify(body));
  }
  async function body(req) {
    if (!String(req.headers['content-type']).startsWith('application/json')) throw Object.assign(new Error('Formato no permitido.'), { status: 415 });
    let text = '', size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024 * 1024) throw Object.assign(new Error('Solicitud demasiado grande.'), { status: 413 });
      text += chunk;
    }
    try { return JSON.parse(text || '{}'); } catch { throw new Error('JSON no válido.'); }
  }
  function rateLimit(req) {
    const key = req.socket.remoteAddress;
    for (const [address, value] of attempts) if (value.until < Date.now()) attempts.delete(address);
    const entry = attempts.get(key) || { count: 0, until: Date.now() + 15 * 60 * 1000 };
    entry.count += 1; attempts.set(key, entry);
    if (entry.count > 15) throw Object.assign(new Error('Demasiados intentos. Espera 15 minutos y vuelve a intentar.'), { status: 429 });
  }
  function newSession(res, user) {
    const token = crypto.randomBytes(32).toString('hex');
    store.createSession(tokenHash(token), user.id, Date.now() + sessionMs);
    res.setHeader('Set-Cookie', cookie(token));
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    try {
      const expectedOrigin = origin || `http://${req.headers.host}`;
      const allowedHost = origin ? new URL(origin).host : `127.0.0.1:${server.address().port}`;
      if (req.headers.host !== allowedHost && (origin || req.headers.host !== `localhost:${server.address().port}`)) {
        return json(res, 403, { error: 'Dirección no permitida.' });
      }
      const url = new URL(req.url, expectedOrigin);
      if (!['GET','POST'].includes(req.method)) return json(res, 405, { error: 'Método no permitido.' });
      if (req.method === 'POST' && (req.headers.origin !== expectedOrigin || req.headers['x-inkajus-request'] !== '1')) {
        return json(res, 403, { error: 'Origen de solicitud no permitido.' });
      }
      if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, { application: 'INKAJUS', status: 'ok' });
      if (url.pathname === '/api/session' && req.method === 'GET') {
        return json(res, 200, { ...snapshot(sessionUser(req)), setupRequired: !store.initialized(), setupTokenRequired: production || !!setupToken });
      }
      if (url.pathname === '/api/setup' && req.method === 'POST') {
        if (store.initialized()) return json(res, 409, { error: 'El espacio ya fue configurado.' });
        rateLimit(req);
        const input = await body(req);
        const local = ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
        if ((production || setupToken) ? !setupToken || input.setupToken !== setupToken : !local) return json(res, 403, { error: 'No se permite configurar desde esta conexión.' });
        const hash = await hashPassword(input.password);
        if (store.initialized()) return json(res, 409, { error: 'El espacio ya fue configurado.' });
        const data = emptyData(); data.settings = settingsForSetup(input.settings);
        const user = { id: crypto.randomUUID(), fullName: 'Lincoln Cuellar Natividad', username: 'cnlincoln', passwordHash: hash, role: 'admin', active: true, employeeId: null };
        data.users.push(user);
        data.audit.push({ id: crypto.randomUUID(), action: 'workspace-created', recordId: user.id, userId: user.id, date: new Date().toISOString(), detail: 'Espacio INKAJUS iniciado sin datos de prueba.' });
        store.save(data, 0); newSession(res, user);
        return json(res, 201, snapshot(safeUser(user)));
      }
      if (url.pathname === '/api/login' && req.method === 'POST') {
        rateLimit(req);
        const input = await body(req);
        const user = store.read().users.find(u => u.username === String(input.username || '').trim() && u.active && !u.deletedAt);
        const valid = await verifyPassword(input.password, user?.passwordHash);
        const active = user && domain(store.read(), user.id).G.auth.current();
        if (!valid || !active) return json(res, 401, { error: 'Usuario o contraseña incorrectos.' });
        attempts.delete(req.socket.remoteAddress);
        store.revoke(tokenHash(tokenOf(req))); newSession(res, user);
        return json(res, 200, snapshot(safeUser(user)));
      }
      if (url.pathname === '/api/logout' && req.method === 'POST') {
        store.revoke(tokenHash(tokenOf(req))); res.setHeader('Set-Cookie', cookie('', 0));
        return json(res, 200, { user: null, data: null, revision: store.revision() });
      }
      if (url.pathname === '/api/command' && req.method === 'POST') {
        let user = sessionUser(req);
        if (!user) return json(res, 401, { error: 'Tu sesión terminó. Inicia sesión nuevamente.' });
        if (user.role !== 'admin') return json(res, 403, { error: 'Esta acción requiere una cuenta de administrador.' });
        const input = await body(req), args = cleanCommand(input.command, input.args);
        let passwordHash;
        if (input.command === 'records.saveUser' && args[0].password) passwordHash = await hashPassword(args[0].password);
        // Volver a validar sesión y revisión después del cálculo asíncrono de contraseña.
        user = sessionUser(req);
        if (!user || user.role !== 'admin') return json(res, 401, { error: 'Tu sesión ya no permite esta acción.' });
        const revision = store.revision();
        if (input.revision !== revision) return json(res, 409, { ...snapshot(user), error: 'Otra sesión actualizó los datos. Revisa los importes y vuelve a guardar.' });
        const runtime = domain(store.read(), user.id);
        const [service, method] = input.command.split('.');
        runtime.G[service][method](...args);
        const data = runtime.data();
        if (input.command === 'records.saveUser') {
          const account = data.users.find(u => args[1] ? u.id === args[1] : u.username === args[0].username);
          if (passwordHash) account.passwordHash = passwordHash;
          if (!account.passwordHash) throw new Error('Define una contraseña para la cuenta.');
          delete account.password;
        }
        store.save(data, revision);
        if (input.command === 'records.saveUser' && args[1] && passwordHash) store.revokeUser(args[1]);
        return json(res, 200, snapshot(sessionUser(req)));
      }
      if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Ruta no disponible.' });
      if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido.' });
      const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
      const target = path.resolve(root, relative);
      const inAssets = target.startsWith(path.join(root, 'assets') + path.sep);
      if ((relative !== 'index.html' && !inAssets) || relative.includes('..') || relative.includes('\\') || relative.includes('\0') || target.endsWith('demo-data.js')) return json(res, 404, { error: 'Archivo no disponible.' });
      const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' }[path.extname(target)];
      if (!mime || !fs.existsSync(target) || !fs.statSync(target).isFile()) return json(res, 404, { error: 'Archivo no disponible.' });
      let content = fs.readFileSync(target);
      if (relative === 'index.html') content = content.toString('utf8').replace(/\s*<script src="assets\/js\/data\/demo-data.js"><\/script>/, '');
      res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' }); res.end(content);
    } catch (error) {
      if (!res.headersSent) json(res, error.status || 400, { error: error.status === 500 ? 'No se pudo completar la operación.' : error.message });
      else res.end();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('close', () => store.close());
  return { server, store };
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8787), host = process.env.HOST || '127.0.0.1';
  const { server } = createApp();
  server.listen(port, host, () => console.log(`INKAJUS disponible en http://localhost:${port}`));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}

module.exports = { createApp };
