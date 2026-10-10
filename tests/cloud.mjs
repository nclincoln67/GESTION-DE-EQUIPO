import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHandler } from '../supabase/functions/team-api/handler.mjs';
import { domain } from '../supabase/functions/team-api/generated/domain.mjs';
const require = createRequire(import.meta.url);
const { emptyData } = require('../server/domain.cjs');

const data = emptyData();
data.users = [{ id: 'admin', fullName: 'Administrador de prueba', username: 'prueba', role: 'admin', active: true }];
const runtime = domain(data, 'admin');
runtime.G.records.saveEmployee({fullName:'Persona de prueba',dni:'99999999',phone:'999999999',position:data.settings.positions[0].label,salary:1000,dayOff:0,scheduleId:data.settings.schedules[0].id,joined:'2025-01-01',birthDate:''});
const employeeId = runtime.data().employees[0].id;
const date = runtime.G.utils.today(), period = date.slice(0,7);
const movement = (typeId,amount,concept) => ({employeeId,typeId,amount,date,period,concept,notes:'',methodId:'cash'});
runtime.G.records.addMovement(movement('advance',300,'Adelanto entregado'));
runtime.G.records.addMovement(movement('bonus',200,'Bono pendiente'));
assert.equal(runtime.G.payroll.calculate(employeeId,period).due,1200);
assert.equal(runtime.G.payroll.calculate(employeeId,period).paid,300);
runtime.G.payroll.addPayment({employeeId,period,amount:900,date,methodId:'cash'});
const protectedId = runtime.data().movements.find(m=>m.typeId==='bonus').id;
runtime.G.records.addMovement(movement('commission',80,'Ingreso posterior'));
assert.equal(runtime.G.payroll.calculate(employeeId,period).remaining,80);
assert.throws(()=>runtime.G.records.voidRecord('movements',protectedId,'Corrección'),/protegido/);
console.log('OK runtime de nube conserva adelantos, liquidación, extras y protección');

const visitor = {id:'visitor',fullName:'Visitante de prueba',username:'visitante',role:'visitor',active:true,employeeId};
const fixture = runtime.data(); fixture.users.push(visitor);
const isolated = domain(fixture,'visitor').G.auth.data();
assert.equal(isolated.employees.length,1);
assert.equal(isolated.users.length,0);
assert.equal(isolated.audit.length,0);
assert.throws(()=>domain(fixture,'visitor').G.records.saveCompany({company:'Ataque'}),/administrador/);
console.log('OK visitante no puede cambiar datos ni consultar usuarios o auditoría');

let saved = 0, revision = 2, state = structuredClone(fixture), lastSaved;
const actorAdmin = {userId:'admin',sessionId:'valid-session'};
const handler = createHandler({
  origins:['https://gestion-de-equipo.pages.dev'],
  verifyToken: async token => token === 'admin-token' ? actorAdmin : token === 'visitor-token' ? {userId:'visitor',sessionId:'valid-session'} : null,
  load: async actor => ({user:state.users.find(u=>u.id===actor.userId),data:actor.userId==='admin'?structuredClone(state):domain(state,'visitor').G.auth.data(),revision}),
  save: async (actor,expected,next) => { assert.equal(actor.userId,'admin'); assert.equal(expected,revision); lastSaved=structuredClone(next); saved++; const users=state.users; state={...next,users}; revision++; },
});
const request = (token,payload,origin='https://gestion-de-equipo.pages.dev') => new Request('https://example.test/team-api',{
  method:payload?'POST':'GET',headers:{origin,...(token?{authorization:`Bearer ${token}`} : {}),...(payload?{'content-type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,
});
assert.equal((await handler(request(null))).status,401);
assert.equal((await handler(request('invalid'))).status,401);
assert.equal((await handler(request('admin-token',null,'https://evil.example'))).status,403);
assert.equal((await handler(request('visitor-token',{command:'payroll.prepare',args:[period],revision:2}))).status,403);
assert.equal((await handler(request('admin-token',{command:'payroll.prepare',args:[period],revision:1}))).status,409);
assert.equal((await handler(request('admin-token',{command:'constructor',args:[],revision:2}))).status,400);
assert.equal((await handler(request('admin-token',{command:'records.saveUser',args:[{password:'never-save'}],revision:2}))).status,501);
assert.equal(saved,0);
const result = await handler(request('admin-token',{command:'records.saveCompany',args:[{company:'Empresa de prueba',payDay:28,users:[{role:'admin'}]}],revision:2}));
assert.equal(result.status,200);
assert.equal(saved,1);
assert.deepEqual(lastSaved.users,[]);
assert.equal(lastSaved.settings.company,'Empresa de prueba');
assert.equal(Object.hasOwn(lastSaved.settings,'users'),false);
assert.equal((await result.json()).revision,3);
assert.equal((await handler(request('admin-token',{command:'payroll.prepare',args:[period],revision:2}))).status,409);
assert.equal(saved,1);
console.log('OK backend rechaza JWT inválido, origen ajeno, permisos insuficientes, revisión antigua e inyección de estado');

const readOnly = await handler(request('visitor-token'));
const visible = await readOnly.json();
assert.equal(readOnly.status,200);
assert.equal(visible.data.users.length,0);
assert.equal(visible.data.audit.length,0);
assert.equal(readOnly.headers.get('cache-control'),'no-store');
assert.equal(readOnly.headers.get('access-control-allow-origin'),'https://gestion-de-equipo.pages.dev');
const failure = createHandler({origins:[],verifyToken:async()=>actorAdmin,load:async()=>{throw Object.assign(new Error('private error'),{status:502});},save:async()=>{}});
const failed = await failure(new Request('https://example.test',{headers:{authorization:'Bearer admin-token'}}));
assert.equal(failed.status,502);
assert.doesNotMatch(JSON.stringify(await failed.json()),/private error/);
console.log('OK respuesta privada sin caché; errores de almacenamiento no exponen detalles');

// Dos peticiones producen runtimes independientes, nunca un global compartido en Deno.
const copyA = domain(fixture,'admin'), copyB = domain(fixture,'admin');
copyA.G.records.saveCompany({company:'Solo A',payDay:30});
assert.notEqual(copyB.data().settings.company,'Solo A');
console.log('OK peticiones aisladas sin contaminación entre runtimes');
