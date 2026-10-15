import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHandler} from '../supabase/functions/team-api/handler.mjs';
import {createLoginHandler} from '../supabase/functions/team-login/handler.mjs';
import {installCloudAdapter} from '../frontend/connection.mjs';
const require=createRequire(import.meta.url),{emptyData}=require('../server/domain.cjs');
const origin='https://gestion-de-equipo.pages.dev';
let loads=0,commits=0,accountReads=0;
const actor={userId:'admin',sessionId:'session'};
const snapshot={user:{id:'admin',role:'admin',active:true},revision:1,data:emptyData()};
snapshot.data.users=[snapshot.user];
const handler=createHandler({origins:[origin],verifyToken:async()=>actor,
  load:async(_,includeAccounts=true)=>{loads++;return {...snapshot,...(includeAccounts?{accounts:[]}:{} )};},
  accounts:async()=>{accountReads++;return [];},
  commit:async(_,revision,next)=>{commits++;assert.equal(revision,1);assert.deepEqual(next.users,[]);return {...snapshot,data:next,revision:2,accounts:[]};}});
const request=body=>new Request('https://example.invalid/api',{method:body?'POST':'GET',headers:{origin,authorization:'Bearer fixture',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
let response=await handler(request());assert.equal(response.status,200);assert.equal(loads,1);assert.equal(accountReads,0);
loads=0;response=await handler(request({command:'records.saveCompany',args:[{company:'Optimización'}],revision:1}));
assert.equal(response.status,200);assert.equal(loads,1);assert.equal(commits,1);assert.equal(accountReads,0);assert.equal((await response.json()).revision,2);
assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('access-control-max-age'),'600');
const login=createLoginHandler({origins:[origin],resolve:async()=>null,authenticate:async()=>null});
response=await login(new Request('https://example.invalid/login',{method:'OPTIONS',headers:{origin}}));assert.equal(response.status,204);assert.equal(response.headers.get('access-control-max-age'),'600');
console.log('OK rendimiento backend: una carga por lectura/cambio, commit atómico y preflight reutilizable; datos privados sin caché');

let session={access_token:'fixture'},revision=1,reads=0,releaseRead,startedRead;
const started=new Promise(resolve=>{startedRead=resolve;});
const gate=new Promise(resolve=>{releaseRead=resolve;});
let delay=false;
const client={auth:{getSession:async()=>({data:{session}}),signOut:async()=>{session=null;return {};},setSession:async value=>{session=value;return {};}}};
const G={utils:{assert:(v,m)=>{if(!v)throw Error(m);}},auth:{},records:{},payroll:{}};
installCloudAdapter(G,client,{url:'https://example.invalid',publishableKey:'sb_publishable_test',functionRegion:'us-west-2'},async(url,options)=>{
  assert.equal(new URL(url).searchParams.get('forceFunctionRegion'),'us-west-2');
  if(options.method==='POST'){const input=JSON.parse(options.body);assert.equal(input.revision,revision);revision++;}
  else{reads++;if(delay){startedRead();await gate;}}
  return Response.json({user:{id:'admin',role:'admin'},revision,data:{employees:[]},accounts:[]});
});
await G.repo.init();assert.equal(reads,1);
const one=G.refresh(),two=G.refresh();assert.strictEqual(one,two);await one;assert.equal(reads,2);
await Promise.all([G.records.saveCompany({}),G.refresh(),G.records.saveCompany({})]);assert.equal(revision,3);
delay=true;const pending=G.refresh();await started;
const queued=G.records.saveCompany({});const queuedCheck=assert.rejects(queued,/sesión cambió/);
await G.auth.logout();releaseRead();await assert.rejects(pending,/sesión cambió/);await queuedCheck;
assert.equal(G.auth.current(),null);assert.equal(revision,3);
console.log('OK cliente: región junto a la base, actualización compartida, orden lectura/escritura y ninguna respuesta tardía tras salir');

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'dist');
require('../scripts/build-frontend.cjs');
const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
assert.equal([...html.matchAll(/<script /g)].length,1);assert.equal([...html.matchAll(/rel="stylesheet"/g)].length,1);
assert.match(html,/<script defer src="\/assets\/build\/app-[a-f0-9]{16}\.js"><\/script>/);
assert.doesNotMatch(html,/demo-data|server-adapter/);
for(const [,file] of html.matchAll(/(?:src|href)="\/?(assets\/[^"?#]+)"/g))assert.ok(fs.existsSync(path.join(out,file)),file);
const jsPath=/src="\/(assets\/build\/app-[a-f0-9]{16}\.js)"/.exec(html)[1];
new vm.Script(fs.readFileSync(path.join(out,jsPath),'utf8'));
const headers=fs.readFileSync(path.join(out,'_headers'),'utf8');
assert.match(headers,/\/assets\/build\/\*\n  Cache-Control: public, max-age=31536000, immutable/);
assert.match(headers,/\n\/\n  Cache-Control: no-store/);
assert.ok(!fs.existsSync(path.join(out,'server')));assert.ok(!fs.existsSync(path.join(out,'storage')));assert.ok(!fs.existsSync(path.join(out,'docs')));
assert.ok(!fs.existsSync(path.join(out,'assets/js/data/demo-data.js')));
console.log('OK publicación: un JS diferido y un CSS versionados; caché pública solo en recursos, sin base, servidor, documentación ni demo');
