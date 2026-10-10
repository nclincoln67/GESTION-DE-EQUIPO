import assert from 'node:assert/strict';
import {createLoginHandler} from '../supabase/functions/team-login/handler.mjs';
import {installCloudAdapter} from '../frontend/connection.mjs';
import {createHandler} from '../supabase/functions/team-api/handler.mjs';
let attempts=0;
const login=createLoginHandler({origins:['https://gestion-de-equipo.pages.dev'],
  resolve:async id=>{attempts++;return id==='limited'?null:id==='user'?'private@example.invalid':'unknown-account@invalid.example';},
  authenticate:async(email,password)=>email==='private@example.invalid'&&password==='test-password'?{access_token:'access',refresh_token:'refresh'}:null});
const req=(body,origin='https://gestion-de-equipo.pages.dev')=>new Request('https://example.invalid/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
assert.equal((await login(req({identifier:'user',password:'test-password'}))).status,200);
const unknown=await login(req({identifier:'unknown',password:'test-password'}));assert.equal(unknown.status,401);assert.deepEqual(await unknown.json(),{error:'Usuario o contraseña incorrectos.'});
assert.equal((await login(req({identifier:'user',password:'incorrect'}))).status,401);
assert.equal((await login(req({identifier:'limited',password:'x'}))).status,429);
assert.equal((await login(req({identifier:'user',password:'x'},'https://evil.invalid'))).status,403);
assert.equal(attempts,4);
assert.equal((await login(req({identifier:'user',password:'x'.repeat(6000)}))).status,413);
assert.equal((await login(req({identifier:'user'}))).status,400);
console.log('OK login por usuario: sesión solo con contraseña válida, respuesta genérica, origen y límites');

let session=null,revision=0,signedOut=0,conflict=false,connectionDown=false;
const snapshot=()=>({user:{id:'admin',role:'admin',active:true},revision,data:{users:[],employees:[],settings:{}},accounts:[{id:'admin',email:'private@example.invalid'}]});
const client={auth:{getSession:async()=>({data:{session}}),setSession:async value=>{session=value;return{};},signOut:async()=>{session=null;signedOut++;return{};}}};
const requests=[];
const fetcher=async(url,options)=>{
  requests.push({url,options});if(connectionDown)throw Error('network');
  if(url.endsWith('team-login'))return Response.json({access_token:'access',refresh_token:'refresh'});
  assert.equal(options.headers.apikey,'sb_publishable_test');assert.equal(options.headers.Authorization,'Bearer access');
  if(options.method==='POST'){
    const input=JSON.parse(options.body);assert.equal(input.revision,revision);
    if(conflict){conflict=false;revision++;return Response.json({...snapshot(),error:'Conflicto'},{status:409});}revision++;
  }return Response.json(snapshot());
};
const G={utils:{assert:(v,m)=>{if(!v)throw Error(m);}},auth:{},records:{},payroll:{}};
installCloudAdapter(G,client,{url:'https://example.invalid',publishableKey:'sb_publishable_test'},fetcher);
await G.repo.init();assert.equal(G.auth.current(),null);
await G.auth.login('user','test-password');assert.equal(G.auth.current().id,'admin');assert.equal(G.cloudAccounts.length,1);
const detached=G.auth.data();detached.employees.push({id:'fake'});assert.equal(G.auth.data().employees.length,0);
await Promise.all([G.records.saveCompany({company:'A'}),G.records.saveCompany({company:'B'})]);assert.equal(revision,2);
conflict=true;await assert.rejects(G.records.saveCompany({company:'C'}),/Conflicto/);assert.equal(revision,3);
await G.records.saveCompany({company:'D'});assert.equal(revision,4);
connectionDown=true;await assert.rejects(G.refresh(),/conectar/);assert.equal(G.auth.current().id,'admin');connectionDown=false;
await G.auth.logout();assert.equal(G.auth.current(),null);assert.equal(G.cloudAccounts.length,0);assert.equal(signedOut,1);assert.throws(()=>G.auth.data(),/sesión/);
console.log('OK adaptador: sesión, renovación mediante SDK, concurrencia, conflicto, fallo de red y cierre sin datos residuales');

let changed;
const accountHandler=createHandler({origins:['https://gestion-de-equipo.pages.dev'],verifyToken:async()=>({userId:'actor',sessionId:'session'}),
  load:async()=>snapshot(),accounts:async()=>[],changeAccount:async(...args)=>{changed=args;return{notice:'Preparada'};}});
const post=(command,args)=>new Request('https://example.invalid/api',{method:'POST',headers:{origin:'https://gestion-de-equipo.pages.dev',authorization:'Bearer jwt','content-type':'application/json'},body:JSON.stringify({command,args,revision})});
let res=await accountHandler(post('records.saveUser',[{fullName:'Test',username:'test',email:'test@example.invalid',role:'admin',untrusted:'discard'},null]));
assert.equal(res.status,200);assert.equal(changed[2],'save');assert.equal(changed[3].untrusted,undefined);
res=await accountHandler(post('records.saveUser',[{password:'do-not-store'},null]));assert.equal(res.status,400);
console.log('OK cuentas: campos permitidos y rechazo de contraseñas en comandos financieros');
