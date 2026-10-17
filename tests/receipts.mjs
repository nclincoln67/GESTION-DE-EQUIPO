import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createReceiptHandler,inspectFile,MAX_BYTES} from '../supabase/functions/team-receipts/handler.mjs';
import {installCloudAdapter} from '../frontend/connection.mjs';
import {createHandler} from '../supabase/functions/team-api/handler.mjs';
import {createRequire} from 'node:module';
const pdf=new TextEncoder().encode('%PDF-1.7\nFixture no real\n%%EOF'),origin='https://gestion-de-equipo.pages.dev';
assert.equal(inspectFile(pdf,'Recibo.pdf','application/pdf'),'application/pdf');
assert.equal(inspectFile(Uint8Array.of(137,80,78,71,13,10,26,10),'Pago.png','image/png'),'image/png');
assert.equal(inspectFile(Uint8Array.of(255,216,255,224),'Pago.jpeg','image/jpeg'),'image/jpeg');
assert.throws(()=>inspectFile(pdf,'malware.png','image/png'),/válido/);
assert.throws(()=>inspectFile(pdf,'../recibo.pdf','application/pdf'),/nombre/);
assert.throws(()=>inspectFile(new Uint8Array(MAX_BYTES+1),'grande.pdf','application/pdf'),/5 MB/);
assert.throws(()=>inspectFile(pdf,'recibo.pdf','text/html'),/válido/);
const actor={userId:'admin',sessionId:'session'},id=crypto.randomUUID();
let puts=0,ready=false,role='admin',lastHash;
const access=async(_,action,collection,record,upload,input)=>{
  assert.equal(collection,'payments');
  if(record==='other'||role==='expired')throw Object.assign(Error('Sin acceso'),{status:403});
  if(action==='list')return {files:ready?[{id,name:'Pago.pdf'}]:[]};
  if(action==='read')return {object_path:id+'.pdf',filename:'Pago.pdf',mime:'application/pdf'};
  if(role!=='admin')throw Object.assign(Error('Sin acceso'),{status:403});
  if(action==='reserve'){assert.match(input.sha256,/^[0-9a-f]{64}$/);if(lastHash)assert.equal(input.sha256,lastHash);lastHash=input.sha256;return {object_path:id+'.pdf',ready_at:ready?'now':null};}
  if(action==='finish'){ready=true;return {id};}
};
const handler=createReceiptHandler({origins:[origin],verifyToken:async()=>actor,access,put:async()=>{puts++;},get:async()=>new Response(pdf)});
const req=(method='POST',extra={},body=pdf)=>new Request('https://example.invalid/team-receipts?'+new URLSearchParams({collection:'payments',record:'p1',id,name:'Pago.pdf',...extra}),
  {method,headers:{authorization:'Bearer fixture',origin,'content-type':'application/pdf','x-file-name':'Pago.pdf'},...(method==='POST'?{body}:{})});
let res=await handler(req());assert.equal(res.status,200);assert.equal(puts,1);assert.equal(ready,true);
res=await handler(req());assert.equal(res.status,200);assert.equal(puts,1,'No sobrescribe al reintentar');
role='visitor';res=await handler(req());assert.equal(res.status,403);
res=await handler(req('GET'));assert.equal(res.status,200);assert.match(res.headers.get('content-disposition'),/^attachment/);assert.match(res.headers.get('cache-control'),/no-store/);
res=await handler(req('GET',{record:'other'}));assert.equal(res.status,403);
role='expired';res=await handler(req('GET'));assert.equal(res.status,403);
res=await handler(new Request('https://example.invalid'));assert.equal(res.status,401);
res=await handler(new Request('https://example.invalid',{method:'OPTIONS',headers:{origin:'https://evil.invalid'}}));assert.equal(res.status,403);
console.log('OK comprobantes: formatos, tamaño, origen, autenticación, descarga privada y reintento sin sobrescribir.');

// El diálogo no repite el pago tras un fallo de carga, tampoco repite archivos ya subidos.
let saves=0,uploads=0,failUpload=true;
const progress={textContent:''},form={querySelectorAll:()=>[],querySelector:()=>null};
const G={utils:{escape:x=>x,assert:(x,m)=>{if(!x)throw Error(m);}},ui:{},receipts:{upload:async()=>{uploads++;if(failUpload){failUpload=false;throw Error('Sin conexión');}}}};
const context=vm.createContext({window:{GE:G},crypto,document:{getElementById:id=>id==='receipt-progress'?progress:form},setTimeout,console});
vm.runInContext(fs.readFileSync(new URL('../assets/js/components/receipts.js',import.meta.url),'utf8'),context);
G.receiptUI.files=()=>[{name:'Pago.pdf'}];
const submit=G.receiptUI.submit(async()=>{saves++;return {createdRecord:{collection:'payments',id:'p1'}};});
await assert.rejects(submit({}),/ya está registrado/);await submit({});assert.equal(saves,1);assert.equal(uploads,2);
const emptySubmit=G.receiptUI.submit(async()=>{saves++;});G.receiptUI.files=()=>[];await emptySubmit({});assert.equal(saves,2);
console.log('OK formulario: pago único ante carga fallida; comprobante opcional.');

// El adaptador nunca conserva un archivo descargado después de cambiar de sesión.
const client={auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}}),signOut:async()=>({})}};
const app={utils:G.utils,auth:{},records:{},payroll:{}};let release;
installCloudAdapter(app,client,{url:'https://example.invalid',publishableKey:'sb_publishable_test',functionRegion:'us-west-2'},async(url,options)=>{
  assert.equal(new URL(url).pathname,'/functions/v1/team-receipts');assert.equal(options.headers.Authorization,'Bearer fixture');
  return {ok:true,blob:()=>new Promise(resolve=>{release=()=>resolve(new Blob([pdf]));})};
});
const download=app.receipts.download({collection:'payments',id:'p1'},id);
await new Promise(resolve=>setTimeout(resolve,0));app.clearCloudData();release();await assert.rejects(download,/sesión cambió/);
console.log('OK sesión: una descarga tardía no se entrega tras salir.');

const {emptyData}=createRequire(import.meta.url)('../server/domain.cjs');
let snapshot={revision:1,user:{id:'admin',role:'admin',active:true},data:emptyData()};
snapshot.data.users=[snapshot.user];snapshot.data.employees=[{id:'person',fullName:'Fixture',active:true,joined:'2026-01-01',salary:1000}];
snapshot.data.settings.types.push({id:'custom-immediate',label:'Otro pago inmediato',nature:'advance',active:true});
const finance=createHandler({origins:[origin],verifyToken:async()=>actor,load:async()=>snapshot,
  commit:async(_,revision,next)=>{snapshot={...snapshot,revision:revision+1,data:{...next,users:[snapshot.user]}};return snapshot;}});
const methodId=snapshot.data.settings.methods.find(m=>m.active).id;
for(const [command,typeId,paymentTiming] of [['payroll.addPayment'],['records.addMovement','advance'],['records.addMovement','commission','paid'],['records.addMovement','custom-immediate']]){
  const response=await finance(new Request('https://example.invalid/team-api',{method:'POST',headers:{origin,authorization:'Bearer fixture','content-type':'application/json'},
    body:JSON.stringify({command,revision:snapshot.revision,args:[{employeeId:'person',amount:10,period:'2026-01',date:'2026-01-20',methodId,concept:'Fixture',typeId,paymentTiming}]})}));
  const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));
  const target=result.createdRecord;assert.ok(snapshot.data[target.collection].some(r=>r.id===target.id));
  assert.equal(target.collection,typeId&&paymentTiming!=='paid'?'movements':'payments');
  if(paymentTiming==='paid')assert.ok(snapshot.data.movements.some(m=>m.paymentId===target.id));
}
console.log('OK destino exacto: pago mensual, adelanto, ingreso pagado y tipo inmediato personalizado.');
