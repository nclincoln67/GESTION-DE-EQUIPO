/* Pruebas sin navegador ni dependencias. El DOM mínimo verifica arranque y contratos
   de formularios/renderizado; la revisión de CSS y experiencia real es manual. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
let checks=0;
function check(description,fn){fn();checks++;console.log('OK '+description);}
const elements=new Map(),store=new Map(),listeners={};
class Element {
  constructor(key){this.key=key;this.innerHTML='';this.value='';this.dataset={};this.elements={employeeId:{value:'emp-1'},period:{value:new Date().toISOString().slice(0,7)},amount:{}};this.classList={add(){},remove(){}};this.isConnected=true;}
  querySelector(selector){return document.querySelector(selector);}
  querySelectorAll(){return [];}
  addEventListener(){}
  focus(){document.activeElement=this;}
}
const document={title:'',activeElement:null,body:new Element('body'),getElementById(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);},querySelector(selector){return this.getElementById(selector.replace(/^#/,''));},querySelectorAll(){return [];},addEventListener(name,fn){listeners[name]=fn;}};
const storage={getItem:key=>store.get(key)||null,setItem:(k,v)=>store.set(k,v)};
const context=vm.createContext({document,localStorage:storage,structuredClone,console,Intl,Date,Math,crypto:require('node:crypto').webcrypto,setTimeout:()=>1,clearTimeout(){},FormData:class{constructor(form){this.form=form;}[Symbol.iterator](){return Object.entries(this.form.fields||{}).values();}}});
context.window=context;context.globalThis=context;
Object.defineProperty(context,'name',{set(value){this._name=String(value);},get(){return this._name||'';}});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
check('todos los recursos locales existen y no se usan módulos ES',()=>{
  assert(!html.includes('type="module"'));
  for(const match of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g))assert(fs.existsSync(path.join(root,match[1])),match[1]);
});
for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const G=context.GE,today=G.utils.today(),period=G.utils.month();
check('arranque muestra login y enlaza el formulario',()=>{assert(elements.get('app').innerHTML.includes('Inicia sesión'));assert.equal(typeof elements.get('login-form').onsubmit,'function');});
check('credenciales incorrectas no abren sesión',()=>assert.throws(()=>G.auth.login('admin','incorrecta')));
check('envío del formulario lleva al dashboard',()=>{elements.get('login-form').fields={username:'admin',password:'admin123'};elements.get('login-form').onsubmit({preventDefault(){},target:elements.get('login-form')});assert(elements.get('app').innerHTML.includes('Tu equipo, en perspectiva.'));});
check('los cinco módulos renderizan',()=>{for(const p of ['home','team','payments','attendance','settings']){G.app.navigate(p);assert(elements.get('app').innerHTML.includes('app-layout'));}});
check('todas las pestañas de pagos y configuración renderizan',()=>{for(const tab of ['summary','movements','history'])G.app.navigate('payments',tab);for(const tab of ['company','users','types','methods','positions','schedules','holidays','audit'])G.app.navigate('settings',tab);});
check('perfil con cinco pestañas renderiza',()=>{G.state.profileId='emp-1';for(const tab of ['information','payments','advances','commissions','attendance']){G.state.profileTab=tab;assert(G.team.profile().includes('Valeria'));}G.state.profileId=null;});
check('movimientos existentes distinguen vigente, pago parcial y pagado sin migrar datos',()=>{
  const d=G.auth.data(),find=eid=>d.movements.find(m=>m.employeeId===eid);
  assert.equal(G.payroll.movementStatus(find('emp-1')),'Vigente');
  assert.equal(G.payroll.movementStatus(find('emp-3')),'Vigente');
  assert.equal(G.payroll.movementStatus(find('emp-7')),'Pagado');
  assert.equal(find('emp-7').state,'valid');
  assert(G.payments.movementTable([find('emp-7')]).includes('>Pagado</span>'));
  G.payments.recordDetail('movements',find('emp-7').id);
  assert(elements.get('dialog-root').innerHTML.includes('>Pagado</span>'));
  assert(elements.get('dialog-root').innerHTML.includes('descuentos reducen el importe'));Bclose();
});
check('filtros de movimientos separan pagados y vigentes; historial mantiene sus estados',()=>{
  G.app.navigate('payments','movements');
  assert(G.views.payments().includes('value="Pagado"'));
  G.state.filters={recordState:'Pagado'};
  assert(G.payments.filteredContent().includes('data-id="mov-9"'));
  assert(!G.payments.filteredContent().includes('data-id="mov-5"'));
  G.state.filters={recordState:'Vigente'};
  assert(G.payments.filteredContent().includes('data-id="mov-5"'));
  assert(!G.payments.filteredContent().includes('data-id="mov-9"'));
  G.app.navigate('payments','history');G.state.filters={recordState:'valid'};
  assert(G.payments.filteredContent().includes('data-id="pay-2"'));
  assert(!G.views.payments().includes('value="Pagado"'));G.state.filters={};
});
check('tarjetas de Camila incluyen comisión y bono: 2100 + 450 - 0 = 2550',()=>{
  G.records.addMovement({employeeId:'emp-3',typeId:'commission',amount:200,date:today,period,concept:'Comisión de prueba de tarjetas'});
  const r=G.payroll.calculate('emp-3',period);
  assert.equal(r.base,2100);assert.equal(r.income,450);assert.equal(r.deduction,0);assert.equal(r.due,2550);assert.equal(r.paid,1000);
  G.state.profileId='emp-3';G.state.profileTab='information';const markup=G.team.profile();
  for(const [label,amount] of [['Sueldo base',2100],['Ingresos adicionales',450],['Descuentos del mes',0],['Estimado del mes',2550]]){
    const card=[...markup.matchAll(/<article class="stat[^>]*>(.*?)<\/article>/gs)].find(m=>m[1].includes(`<span>${label}</span>`));
    assert(card,label);assert(card[1].includes(`<strong>${G.utils.money(amount)}</strong>`));
  }
  assert(!markup.includes('Sueldo actual'));G.state.profileId=null;
});
check('nombre de persona no colisiona con window.name',()=>{assert.equal(context.name,'');assert(G.views.home().includes('Valeria'));});
check('adelantos antiguos se reclasifican sin duplicar registros ni cambiar el saldo',()=>{
  const before=JSON.stringify(G.repo.read()),d=G.repo.read();d.settings.types.find(t=>t.id==='advance').nature='deduction';
  const r=G.payroll.calculate('emp-1',period,d);
  assert.equal(r.due,2040);assert.equal(r.advances,400);assert.equal(r.paid,400);assert.equal(r.deduction,0);assert.equal(r.remaining,1640);
  const entries=G.payroll.paymentEntries(d).filter(p=>p.id==='mov-2');assert.equal(entries.length,1);assert.equal(entries[0].sourceCollection,'movements');
  assert.equal(G.payroll.movementStatus(d.movements.find(m=>m.id==='mov-2'),d),'Pagado');
  assert.equal(JSON.stringify(G.repo.read()),before);
  G.repo.init();assert.equal(G.payroll.calculate('emp-1',period).remaining,1640);
});
check('historial incluye adelantos con origen correcto y no los cuenta dos veces',()=>{
  G.app.navigate('payments','history');G.state.filters={search:'Valeria'};
  const markup=G.payments.filteredContent();assert.equal([...markup.matchAll(/data-action="record-detail" data-id="mov-2"/g)].length,1);
  assert(markup.includes('data-id="mov-2" data-collection="movements"'));assert(markup.includes('Adelanto'));assert(markup.includes('No registrado'));
  G.state.filters={recordState:'valid',from:today,to:today};G.payments.filteredContent();G.state.filters={};
});
check('formulario distingue dinero entregado de conceptos pendientes y exige método cuando corresponde',()=>{
  document.querySelector('#f-typeId').value='advance';G.payments.movementForm('advance','emp-1');
  assert(elements.get('dialog-root').innerHTML.includes('Adelanto · Pago inmediato'));
  assert(!elements.get('dialog-root').innerHTML.includes('Adelanto · Adelanto'));
  assert.equal(document.querySelector('#f-methodId').required,true);assert.equal(document.querySelector('#advance-fields').hidden,false);
  assert(document.querySelector('#movement-effect').textContent.includes('dinero ya entregado'));
  document.querySelector('#f-typeId').value='commission';document.querySelector('#f-typeId').onchange();
  assert.equal(document.querySelector('#f-methodId').disabled,true);assert.equal(document.querySelector('#f-methodId').required,false);
  assert.equal(document.querySelector('#advance-fields').hidden,true);Bclose();document.querySelector('#f-typeId').value='';
});
G.app.navigate('payments');
check('detalle de pago y formularios abren sin excepciones',()=>{G.payments.detail('emp-1');G.payments.movementForm('advance','emp-1');G.payments.paymentForm('emp-1');G.team.form('emp-1');G.attendance.form('emp-1');G.settings.userForm('admin-2');G.settings.catalogForm('types','commission');Bclose();});
function Bclose(){G.ui.close();}
let employeeId;
check('crear empleado y rechazar DNI duplicado',()=>{const input={fullName:'Persona de Prueba',dni:'99999999',phone:'900 111 222',joined:today,position:'Prueba',salary:1500,dayOff:'0',scheduleId:'schedule-1',birthDate:'',email:'',address:'',functions:'',observations:''};G.records.saveEmployee(input);employeeId=G.auth.employees().find(e=>e.dni===input.dni).id;assert.throws(()=>G.records.saveEmployee(input));});
const movement=(typeId,amount,eventId=null)=>({employeeId,typeId,amount,date:today,period,concept:'Prueba de cálculo',notes:'',eventId,methodId:'cash'});
check('dos adelantos cuentan como pagos, no como descuentos del sueldo',()=>{G.records.addMovement(movement('advance',300));G.records.addMovement(movement('advance',200));const r=G.payroll.calculate(employeeId,period);assert.equal(r.due,1500);assert.equal(r.deduction,0);assert.equal(r.advances,500);assert.equal(r.paid,500);assert.equal(r.remaining,1000);assert.equal(r.status,'Pago parcial');});
check('comisión y bono aumentan el estimado sin registrar salidas de dinero',()=>{G.records.addMovement(movement('commission',100));G.records.addMovement(movement('bonus',200));const r=G.payroll.calculate(employeeId,period);assert.equal(r.due,1800);assert.equal(r.paid,500);assert.equal(r.remaining,1300);});
check('tarjetas restan todos los descuentos, incluyendo tipos personalizados, sin registrar pagos',()=>{
  G.records.saveCatalog('types',{label:'Descuento de prueba',nature:'deduction'});
  const type=G.auth.data().settings.types.find(t=>t.label==='Descuento de prueba');
  G.records.addMovement(movement(type.id,25));
  const r=G.payroll.calculate(employeeId,period);assert.equal(r.deduction,25);assert.equal(r.due,1775);assert.equal(r.paid,500);assert.equal(r.remaining,1275);
  G.state.profileId=employeeId;const markup=G.team.profile();
  assert(markup.includes(G.ui.stat('Descuentos del mes',G.utils.money(25),'arrow','Reducen el estimado; no son pagos')));
  const m=G.auth.data().movements.find(m=>m.employeeId===employeeId&&m.typeId===type.id);
  G.records.voidRecord('movements',m.id,'Descuento de prueba anulado');
  assert.equal(G.payroll.movementStatus(G.auth.data().movements.find(x=>x.id===m.id)),'Anulado');
  assert.equal(G.payroll.calculate(employeeId,period).deduction,0);
  G.app.navigate('payments','movements');G.state.filters={recordState:'Anulado'};
  assert(G.payments.filteredContent().includes(`data-id="${m.id}"`));G.state.filters={};
});
check('pago parcial actualiza saldo y estado',()=>{G.payroll.addPayment({employeeId,period,amount:1000,date:today,methodId:'transfer'});const r=G.payroll.calculate(employeeId,period);assert.equal(r.remaining,300);assert.equal(r.status,'Pago parcial');});
check('pago superior al saldo es rechazado',()=>assert.throws(()=>G.payroll.addPayment({employeeId,period,amount:301,date:today,methodId:'cash'})));
check('segundo pago completa el periodo',()=>{G.payroll.addPayment({employeeId,period,amount:300,date:today,methodId:'cash'});assert.equal(G.payroll.calculate(employeeId,period).status,'Pagado');});
check('liquidar marca todos los movimientos no anulados como pagados sin duplicar montos',()=>{
  const d=G.auth.data(),r=G.payroll.calculate(employeeId,period);
  for(const m of r.movements)assert.equal(G.payroll.movementStatus(m,d),'Pagado');
  assert.equal(r.due,1800);assert.equal(r.paid,1800);assert.equal(r.deduction,0);assert.equal(r.income,300);assert.equal(r.advances,500);assert.equal(r.otherPaid,1300);
  const annulled=d.movements.find(m=>m.employeeId===employeeId&&m.state==='void');assert.equal(G.payroll.movementStatus(annulled,d),'Anulado');
});
check('historial no permite anular adelantos protegidos del mes liquidado',()=>{
  const r=G.payroll.calculate(employeeId,period),entries=r.payments.filter(p=>p.sourceCollection==='movements');
  assert.equal(entries.length,2);const markup=G.payments.paymentTable(entries);
  assert(markup.includes('Protegido'));assert(!markup.includes('data-action="record-void"'));
  assert(markup.includes('data-collection="movements"'));
});
check('pago completo bloquea anulaciones de adelanto, comisión y bono sin modificar datos',()=>{const before=JSON.stringify(G.repo.read());for(const typeId of ['advance','commission','bonus']){const m=G.repo.read().movements.find(m=>m.employeeId===employeeId&&m.typeId===typeId);assert.throws(()=>G.records.voidRecord('movements',m.id,'Intento tras pagar'),/liquidado y protegido/);assert.throws(()=>G.app.action({dataset:{action:'record-void',id:m.id,collection:'movements'}}),/liquidado y protegido/);}assert.equal(JSON.stringify(G.repo.read()),before);assert(G.payments.movementTable(G.repo.read().movements.filter(m=>m.employeeId===employeeId)).includes('Liquidado · protegido'));assert(!G.payments.movementTable(G.repo.read().movements.filter(m=>m.employeeId===employeeId)).includes('data-action="record-void"'));});
check('pago completo permite ingresos adicionales y sigue bloqueando descuentos o anticipos sin saldo',()=>{assert.throws(()=>G.records.addMovement(movement('discount',25)),/ya está liquidado/);assert.throws(()=>G.records.addMovement(movement('advance',25)),/ya está liquidado/);G.repo.init();assert(G.payroll.isSettled(employeeId,period));});
check('corregir un pago erróneo deja saldo pendiente',()=>{const p=G.repo.read().payments.find(p=>p.employeeId===employeeId&&p.amount===300);G.records.voidRecord('payments',p.id,'Pago registrado por error');assert.equal(G.payroll.calculate(employeeId,period).remaining,300);assert.equal(G.payroll.isSettled(employeeId,period),false);});
check('corregir pago conserva la protección y estado de los movimientos liquidados',()=>{
  for(const m of G.auth.data().movements.filter(m=>m.employeeId===employeeId))assert.equal(G.payroll.movementStatus(m),m.state==='valid'?'Pagado':'Anulado');
});
check('corregir un recibo no desbloquea movimientos anteriormente liquidados',()=>{const m=G.repo.read().movements.find(m=>m.employeeId===employeeId&&m.amount===300&&m.typeId==='advance');const before=JSON.stringify(G.repo.read());assert.throws(()=>G.records.voidRecord('movements',m.id,'Corrección de prueba'),/liquidado y protegido/);assert.equal(JSON.stringify(G.repo.read()),before);assert.equal(G.payroll.calculate(employeeId,period).remaining,300);});
check('sueldo histórico no cambia al actualizar perfil',()=>{const e=G.auth.employees().find(e=>e.id===employeeId);G.records.saveEmployee({...e,salary:1800},employeeId);assert.equal(G.payroll.calculate(employeeId,period).base,1500);});
check('tarjeta sueldo base usa el sueldo del periodo y no el nuevo sueldo actual',()=>{
  G.state.profileId=employeeId;G.state.profileTab='information';
  assert(G.team.profile().includes(G.ui.stat('Sueldo base',G.utils.money(1500),'wallet','Sueldo conservado para este mes')));G.state.profileId=null;
});
check('botón delegado abre perfil real del estado de aplicación',()=>{listeners.click({target:{closest:()=>({dataset:{action:'profile',id:employeeId}})}});assert.equal(G.state.profileId,employeeId);assert(elements.get('app').innerHTML.includes('Persona de Prueba'));});
check('formulario de movimiento guarda y actualiza la pantalla',()=>{G.app.navigate('payments','movements');listeners.click({target:{closest:()=>({dataset:{action:'movement-new',type:'commission',id:employeeId}})}});const form=elements.get('form');form.fields=movement('commission',25);form.onsubmit({preventDefault(){},target:form});assert.equal(G.payroll.calculate(employeeId,period).due,1825);assert(elements.get('app').innerHTML.includes('Prueba de cálculo'));assert.equal(elements.get('dialog-root').innerHTML,'');});
check('desactivar conserva historial',()=>{G.records.toggleEmployee(employeeId);assert.equal(G.auth.employees().find(e=>e.id===employeeId).active,false);assert(G.payroll.rows(period).some(r=>r.employee.id===employeeId));G.records.toggleEmployee(employeeId);});
check('asistencia admite un único movimiento asociado vigente',()=>{G.records.saveEvent({employeeId,type:'Día libre trabajado',start:today,end:today,description:'Prueba',notes:''});const ev=G.repo.read().events.at(-1);G.records.addMovement(movement('dayoff',50,ev.id));assert.throws(()=>G.records.addMovement(movement('dayoff',50,ev.id)));});
check('desactivar sesión propia y único administrador está bloqueado',()=>{assert.throws(()=>G.records.toggleUser('admin-1'));G.records.toggleUser('admin-2');assert.throws(()=>G.records.saveUser({fullName:'Elena',username:'admin',role:'visitor',employeeId:'emp-1',password:''},'admin-1'));G.records.toggleUser('admin-2');});
check('múltiples administradores pueden iniciar sesión',()=>{G.auth.logout();G.auth.login('admin2','admin123');assert(G.auth.isAdmin());});
check('visitante recibe solo su perfil y registros',()=>{G.auth.logout();G.auth.login('valeria','visita123');const d=G.auth.data();assert.equal(d.employees.length,1);assert.equal(d.employees[0].id,'emp-1');for(const key of ['movements','payments','events','periods'])assert(d[key].every(r=>r.employeeId==='emp-1'));assert.equal(d.users.length,0);assert.equal(d.audit.length,0);});
check('historial combinado y total de adelantos respetan el perfil del visitante',()=>{
  assert(G.payroll.paymentEntries().every(p=>p.employeeId==='emp-1'));
  assert.equal(G.payroll.totals(period).paid,400);assert.equal(G.payroll.totals(period).advances,400);
  G.app.navigate('payments','history');const markup=G.payments.filteredContent();assert(markup.includes('data-id="mov-2"'));assert(!markup.includes('data-id="mov-4"'));assert(!markup.includes('data-action="record-void"'));
});
check('visitante no puede consultar otros perfiles ni mutar',()=>{assert.throws(()=>G.payroll.calculate('emp-2',period));assert.throws(()=>G.records.addMovement(movement('bonus',100)));assert.throws(()=>G.records.toggleEmployee('emp-1'));assert.throws(()=>G.records.saveUser({}));assert.throws(()=>G.app.navigate('settings'));});
check('vista visitante no expone compañeros o edición',()=>{for(const page of ['home','team','payments','attendance']){G.app.navigate(page);const markup=elements.get('app').innerHTML;assert(!markup.includes('Mateo Salazar'));assert(!markup.includes('data-action="employee-new"'));assert(!markup.includes('data-action="movement-new"'));assert(!markup.includes('data-page="settings"'));}});
check('cambios persisten al reinicializar repositorio',()=>{G.repo.init();assert(G.repo.read().employees.some(e=>e.id===employeeId));assert(G.repo.read().audit.length>0);});
check('fallo de almacenamiento conserva memoria previa',()=>{G.auth.logout();G.auth.login('admin','admin123');const before=G.repo.read().settings.company;const original=storage.setItem;storage.setItem=()=>{throw new Error('Sin espacio');};assert.throws(()=>G.records.saveCompany({company:'Otro',payDay:30}));assert.equal(G.repo.read().settings.company,before);storage.setItem=original;});
check('sueldo 1000 + bono 200 - descuento 100: estimado 1100, pagos 500, saldo 600',()=>{
  G.records.saveEmployee({fullName:'Prueba separación de dinero',dni:'88776655',phone:'900 000 000',joined:today,position:'Prueba',salary:1000,dayOff:'0',scheduleId:'schedule-1',birthDate:''});
  const eid=G.auth.employees().find(e=>e.dni==='88776655').id,entry=(typeId,amount)=>({...movement(typeId,amount),employeeId:eid});
  const before=JSON.stringify(G.repo.read());
  assert.throws(()=>G.records.addMovement({...entry('advance',300),methodId:''}),/método/);
  assert.throws(()=>G.records.addMovement({...entry('advance',300),methodId:'inexistente'}),/método/);
  assert.throws(()=>G.records.addMovement(entry('advance',1001)),/superar el saldo/);
  assert.equal(JSON.stringify(G.repo.read()),before);
  G.records.addMovement(entry('bonus',200));G.records.addMovement(entry('discount',100));
  const count=G.repo.read().payments.length;G.records.addMovement(entry('advance',300));assert.equal(G.repo.read().payments.length,count);
  G.payroll.addPayment({employeeId:eid,period,amount:200,date:today,methodId:'cash'});
  const r=G.payroll.calculate(eid,period);assert.equal(r.due,1100);assert.equal(r.deduction,100);assert.equal(r.advances,300);assert.equal(r.otherPaid,200);assert.equal(r.paid,500);assert.equal(r.remaining,600);
  assert.equal(r.payments.length,2);assert.equal(G.payroll.movementStatus(r.movements.find(m=>m.typeId==='advance')),'Pagado');assert.equal(G.payroll.movementStatus(r.movements.find(m=>m.typeId==='bonus')),'Vigente');
  G.payments.detail(eid);assert(elements.get('dialog-root').innerHTML.includes('Pagos realizados, incluidos adelantos'));Bclose();
  G.repo.init();assert.equal(G.payroll.calculate(eid,period).paid,500);
  const advance=r.movements.find(m=>m.typeId==='advance');G.records.voidRecord('movements',advance.id,'Adelanto registrado por error');
  const corrected=G.payroll.calculate(eid,period);assert.equal(corrected.due,1100);assert.equal(corrected.paid,200);assert.equal(corrected.remaining,900);
  G.app.navigate('payments','history');G.state.filters={search:'Prueba separación',recordState:'void'};
  assert(G.payments.filteredContent().includes(`data-id="${advance.id}"`));G.state.filters={};
});
check('tipos personalizados de adelanto cuentan como pagos y conservan su efecto al eliminar el tipo',()=>{
  const eid=G.auth.employees().find(e=>e.dni==='88776655').id;G.records.saveCatalog('types',{label:'Adelanto personalizado',nature:'advance'});
  const type=G.auth.data().settings.types.find(t=>t.label==='Adelanto personalizado');
  G.records.addMovement({...movement(type.id,100),employeeId:eid});const r=G.payroll.calculate(eid,period);
  assert.equal(r.due,1100);assert.equal(r.advances,100);assert.equal(r.paid,300);assert.equal(r.remaining,800);
  G.records.deleteCatalog('types',type.id);assert.equal(G.payroll.calculate(eid,period).paid,300);
});
check('pago parcial permite anular mientras el total no baje de lo pagado',()=>{
  G.records.saveEmployee({fullName:'Prueba de cierre',dni:'99887766',phone:'900 000 000',joined:today,position:'Prueba',salary:1000,dayOff:'0',scheduleId:'schedule-1',birthDate:''});
  const eid=G.auth.employees().find(e=>e.dni==='99887766').id;
  G.records.addMovement({...movement('commission',500),employeeId:eid});
  G.payroll.addPayment({employeeId:eid,period,amount:1400,date:today,methodId:'cash'});
  const m=G.repo.read().movements.find(m=>m.employeeId===eid);
  assert.throws(()=>G.records.voidRecord('movements',m.id,'Corregir comisión'),/por debajo de lo ya pagado/);
  assert.throws(()=>G.records.addMovement({...movement('discount',101),employeeId:eid}),/por debajo de lo ya pagado/);
  assert.throws(()=>G.records.addMovement({...movement('advance',101),employeeId:eid}),/superar el saldo pendiente/);
  G.records.addMovement({...movement('advance',50),employeeId:eid});
  const a=G.repo.read().movements.find(m=>m.employeeId===eid&&m.typeId==='advance');
  G.records.voidRecord('movements',a.id,'Corregir adelanto');
  assert.equal(G.payroll.calculate(eid,period).remaining,100);
  G.payroll.addPayment({employeeId:eid,period,amount:100,date:today,methodId:'cash'});
  assert.throws(()=>G.records.voidRecord('movements',m.id,'Corregir comisión'),/liquidado y protegido/);
  G.payments.detail(eid);assert(elements.get('dialog-root').innerHTML.includes('Agregar ingreso / movimiento'));G.ui.close();
  assert.equal(G.payroll.calculate(eid,period).status,'Pagado');
});
check('confirmación abierta antes de pagar también se bloquea al guardar',()=>{
  G.records.addMovement(movement('bonus',30));
  const m=G.repo.read().movements.at(-1);
  G.app.action({dataset:{action:'record-void',id:m.id,collection:'movements'}});
  const form=elements.get('form');
  G.payroll.addPayment({employeeId,period,amount:G.payroll.calculate(employeeId,period).remaining,date:today,methodId:'cash'});
  form.fields={reason:'Intento con modal antiguo'};form.onsubmit({preventDefault(){},target:form});
  assert(elements.get('form-error').textContent.includes('liquidado y protegido'));
  assert.equal(G.repo.read().movements.find(x=>x.id===m.id).state,'valid');G.ui.close();
});
let supplementEmployeeId,originalPayment;
const supplement=(amount,timing='pending')=>({...movement('bonus',amount),employeeId:supplementEmployeeId,paymentTiming:timing,concept:'Bono posterior a la liquidación'});
check('crear ingreso después de liquidar abre solo el saldo nuevo y protege los anteriores',()=>{
  G.records.saveEmployee({fullName:'Prueba pagos adicionales',dni:'88776644',phone:'900 000 000',joined:today,position:'Prueba',salary:1000,dayOff:'0',scheduleId:'schedule-1',birthDate:''});
  supplementEmployeeId=G.auth.employees().find(e=>e.dni==='88776644').id;
  G.records.addMovement({...movement('commission',200),employeeId:supplementEmployeeId});
  G.payroll.addPayment({employeeId:supplementEmployeeId,period,amount:1200,date:today,methodId:'cash'});
  originalPayment=G.repo.read().payments.at(-1);
  const old=G.repo.read().movements.find(m=>m.employeeId===supplementEmployeeId);
  G.records.addMovement(supplement(80));
  const d=G.repo.read(),r=G.payroll.calculate(supplementEmployeeId,period);
  assert.equal(r.base,1000);assert.equal(r.due,1280);assert.equal(r.paid,1200);assert.equal(r.remaining,80);
  assert.deepEqual(d.payments.find(p=>p.id===originalPayment.id),originalPayment);
  const oldAfter=d.movements.find(m=>m.id===old.id),fresh=d.movements.at(-1);
  assert.equal(oldAfter.amount,old.amount);assert.equal(oldAfter.concept,old.concept);assert(oldAfter.settledAt);
  assert.equal(G.payroll.movementStatus(oldAfter),'Pagado');assert.equal(G.payroll.movementStatus(fresh),'Vigente');
  assert.throws(()=>G.records.voidRecord('movements',old.id,'Intentar modificar el pasado'),/liquidado y protegido/);
  G.repo.init();assert.throws(()=>G.app.action({dataset:{action:'record-void',collection:'movements',id:old.id}}),/liquidado y protegido/);
});
check('ingreso adicional ya entregado se guarda junto a un solo pago, sin absorber otros pendientes',()=>{
  const before=G.repo.read(),count=before.payments.length;
  assert.throws(()=>G.records.addMovement({...supplement(20,'paid'),methodId:''}),/método/);
  assert.throws(()=>G.records.addMovement(supplement(20,'invalid')),/Selecciona si/);
  assert.equal(JSON.stringify(G.repo.read()),JSON.stringify(before));
  G.records.addMovement(supplement(20,'paid'));const d=G.repo.read(),m=d.movements.at(-1),p=d.payments.at(-1),r=G.payroll.calculate(supplementEmployeeId,period);
  assert.equal(d.payments.length,count+1);assert.equal(p.movementId,m.id);assert.equal(m.paymentId,p.id);assert.equal(p.amount,20);
  assert.equal(G.payroll.movementStatus(m),'Pagado');assert.equal(r.due,1300);assert.equal(r.paid,1220);assert.equal(r.remaining,80);
  assert.deepEqual(d.payments.find(p=>p.id===originalPayment.id),originalPayment);
  assert.throws(()=>G.records.voidRecord('movements',m.id,'Anular ingreso ya pagado'),/liquidado y protegido/);
  assert.throws(()=>G.records.voidRecord('payments',p.id,'Anular pago vinculado'),/liquidado y protegido/);
  assert(!G.payments.paymentTable([p]).includes('data-action="record-void"'));
});
check('completar pago del nuevo pendiente no cambia recibos anteriores y vuelve a sellar los nuevos',()=>{
  G.payroll.addPayment({employeeId:supplementEmployeeId,period,amount:80,date:today,methodId:'cash'});
  assert.equal(G.payroll.calculate(supplementEmployeeId,period).remaining,0);
  G.records.addMovement(supplement(15));
  assert.equal(G.payroll.calculate(supplementEmployeeId,period).remaining,15);
  const d=G.repo.read(),fresh=d.movements.at(-1);
  for(const m of d.movements.filter(m=>m.employeeId===supplementEmployeeId&&m.id!==fresh.id)){
    assert.equal(G.payroll.movementStatus(m),'Pagado');assert.throws(()=>G.records.voidRecord('movements',m.id,'Anulación posterior'),/liquidado y protegido/);
  }
  G.records.voidRecord('movements',fresh.id,'Ingreso pendiente registrado por error');
  assert.equal(G.payroll.calculate(supplementEmployeeId,period).remaining,0);
  assert.deepEqual(G.repo.read().payments.find(p=>p.id===originalPayment.id),originalPayment);
});
check('fallo al guardar ingreso y pago juntos no deja registros ni bloqueos incompletos',()=>{
  const before=JSON.stringify(G.repo.read()),save=storage.setItem;
  storage.setItem=()=>{throw new Error('Sin espacio');};
  try{assert.throws(()=>G.records.addMovement(supplement(40,'paid')),/Sin espacio/);}finally{storage.setItem=save;}
  assert.equal(JSON.stringify(G.repo.read()),before);
});
check('periodos liquidados antiguos también conservan su protección al recibir extras',()=>{
  const d=G.repo.read(),old=d.movements.find(m=>m.employeeId==='emp-7'),receipt=d.payments.find(p=>p.employeeId==='emp-7');assert(!old.settledAt);
  G.records.addMovement({...movement('bonus',35),employeeId:'emp-7'});
  const saved=G.repo.read().movements.find(m=>m.id===old.id);assert(saved.settledAt);
  assert.equal(G.payroll.calculate('emp-7',period).remaining,35);assert.equal(G.payroll.movementStatus(saved),'Pagado');
  assert.deepEqual(G.repo.read().payments.find(p=>p.id===receipt.id),receipt);
  assert.throws(()=>G.records.voidRecord('movements',old.id,'Modificar reembolso previo'),/liquidado y protegido/);
});
check('formulario permite elegir ingreso pagado y Registrar pago abre extras si no hay saldo',()=>{
  document.querySelector('#f-typeId').value='bonus';document.querySelector('#f-paymentTiming').value='pending';
  G.payments.movementForm('bonus',supplementEmployeeId);
  assert(elements.get('dialog-root').innerHTML.includes('Sí, registrar ingreso y pago juntos'));
  document.querySelector('#f-paymentTiming').value='paid';document.querySelector('#f-paymentTiming').onchange();
  assert.equal(document.querySelector('#f-methodId').required,true);assert.equal(document.querySelector('#advance-fields').hidden,false);
  assert(document.querySelector('#movement-effect').textContent.includes('contará una sola vez'));Bclose();
  document.querySelector('#f-typeId').value='';document.querySelector('#f-paymentTiming').value='';
  G.payments.paymentForm(supplementEmployeeId);
  assert(elements.get('dialog-root').innerHTML.includes('Sí, registrar ingreso y pago juntos'));
  assert.equal(document.querySelector('#f-methodId').required,true);Bclose();
  G.payments.detail(supplementEmployeeId);assert(elements.get('dialog-root').innerHTML.includes('Agregar ingreso / movimiento'));Bclose();
});
check('formulario guarda los 80 de día trabajado ya entregados con movimiento y pago únicos',()=>{
  G.app.navigate('payments','movements');const count=G.repo.read().payments.length;
  G.payments.movementForm('dayoff',supplementEmployeeId,null,period);
  const form=elements.get('form');form.fields={...supplement(80,'paid'),typeId:'dayoff',concept:'Día libre trabajado + comisiones',reference:'EXTRA-80'};
  form.onsubmit({preventDefault(){},target:form});const d=G.repo.read(),m=d.movements.at(-1),p=d.payments.at(-1);
  assert.equal(m.amount,80);assert.equal(m.typeId,'dayoff');assert.equal(m.paymentId,p.id);assert.equal(p.movementId,m.id);
  assert.equal(d.payments.length,count+1);assert.equal(G.payroll.calculate(supplementEmployeeId,period).remaining,0);
  assert.equal(elements.get('dialog-root').innerHTML,'');assert(elements.get('app').innerHTML.includes('Día libre trabajado + comisiones'));
  assert(G.payments.paymentTable([p]).includes('EXTRA-80')===false);assert(G.payments.paymentTable([p]).includes('Día libre trabajado + comisiones'));
});
check('Equipo y todos los catálogos ofrecen Eliminar al administrador',()=>{G.app.navigate('team');assert(G.team.rows().includes('data-action="employee-delete"'));for(const tab of ['users','types','methods','positions','schedules']){G.app.navigate('settings',tab);assert(G.settings.content().includes(`data-action="${tab==='users'?'user':'catalog'}-delete"`));}});
check('visitante no puede ejecutar ninguna eliminación',()=>{G.auth.logout();G.auth.login('valeria','visita123');assert.throws(()=>G.records.deleteEmployee(employeeId));assert.throws(()=>G.records.deleteUser('admin-2'));assert.throws(()=>G.records.deleteCatalog('types','commission'));assert(!G.team.profile().includes('employee-delete'));G.auth.logout();G.auth.login('admin','admin123');});
check('confirmación de eliminar trabajador no modifica hasta confirmar',()=>{G.app.navigate('team');listeners.click({target:{closest:()=>({dataset:{action:'employee-delete',id:employeeId}})}});assert(!G.repo.read().employees.find(e=>e.id===employeeId).deletedAt);assert(elements.get('dialog-root').innerHTML.includes('Eliminar trabajador'));G.ui.close();assert(G.auth.employees().some(e=>e.id===employeeId));});
check('confirmar eliminación retira trabajador y conserva saldos e historial',()=>{const before=G.payroll.calculate(employeeId,period),history=G.repo.read().payments.length;G.app.action({dataset:{action:'employee-delete',id:employeeId}});const form=elements.get('form');form.fields={};form.onsubmit({preventDefault(){},target:form});assert(!G.auth.employees().some(e=>e.id===employeeId));assert(!G.team.rows().includes('Persona de Prueba'));assert.equal(G.repo.read().payments.length,history);assert.equal(G.payroll.calculate(employeeId,period).remaining,before.remaining);assert(G.repo.read().audit.some(a=>a.action==='employee-deleted'));G.state.profileId=employeeId;assert(G.team.profile().includes('Eliminado'));assert(!G.team.profile().includes('employee-edit'));G.state.profileId=null;});
check('empleado eliminado no se edita, reactiva ni recibe nuevos eventos/movimientos',()=>{assert.throws(()=>G.records.toggleEmployee(employeeId));assert.throws(()=>G.records.addMovement(movement('bonus',10)));assert.throws(()=>G.records.saveEvent({employeeId,type:'Permiso',start:today,end:today}));});
check('eliminar usuario conserva autoría y bloquea inicio de sesión',()=>{G.records.deleteUser('admin-2');G.app.navigate('settings','users');assert(!G.settings.content().includes('admin2'));assert(G.repo.read().users.find(u=>u.id==='admin-2').deletedAt);G.auth.logout();assert.throws(()=>G.auth.login('admin2','admin123'));G.auth.login('admin','admin123');assert.throws(()=>G.records.deleteUser('admin-1'));assert(G.payments.paymentTable(G.auth.data().payments).includes('Transferencia'));});
check('eliminar trabajador deshabilita visitantes vinculados',()=>{G.records.deleteEmployee('emp-1');assert.equal(G.repo.read().users.find(u=>u.id==='visitor-1').active,false);assert.throws(()=>G.records.toggleUser('visitor-1'));G.auth.logout();assert.throws(()=>G.auth.login('valeria','visita123'));G.auth.login('admin','admin123');});
check('eliminar tipos y métodos no altera cálculos o nombres históricos',()=>{const before=G.payroll.calculate('emp-2',period).due;G.records.deleteCatalog('types','commission');G.records.deleteCatalog('methods','transfer');assert.equal(G.payroll.calculate('emp-2',period).due,before);G.app.navigate('settings','types');assert(!G.settings.content().includes('data-id="commission"'));G.app.navigate('settings','methods');assert(!G.settings.content().includes('data-id="transfer"'));assert(G.payments.movementTable(G.auth.data().movements).includes('Comisión'));assert(G.payments.paymentTable(G.auth.data().payments).includes('Transferencia'));assert.throws(()=>G.records.toggleCatalog('types','commission'));assert.throws(()=>G.payments.movementForm('commission'));assert(!G.views.home().includes('data-type="commission"'));});
check('cargos y horarios eliminados salen de listas pero conservan referencias',()=>{const e=G.auth.data().employees.find(e=>e.id==='emp-3'),position=G.auth.data().settings.positions.find(p=>p.label===e.position);G.records.deleteCatalog('positions',position.id);G.records.deleteCatalog('schedules','schedule-1');G.app.navigate('settings','positions');assert(!G.settings.content().includes(`data-id="${position.id}"`));G.app.navigate('settings','schedules');assert(!G.settings.content().includes('data-id="schedule-1"'));G.team.form();assert(!elements.get('dialog-root').innerHTML.includes('value="schedule-1"'));G.ui.close();G.state.profileId='emp-3';assert(G.team.profile().includes('Horario general'));G.state.profileId=null;});
check('feriado eliminado desaparece de configuración y calendario',()=>{G.records.saveCatalog('holidays',{label:'Feriado prueba eliminar',date:today});const h=G.auth.data().settings.holidays.at(-1);G.app.navigate('settings','holidays');assert(G.settings.content().includes('catalog-delete'));G.app.action({dataset:{action:'catalog-delete',collection:'holidays',id:h.id}});const form=elements.get('form');form.fields={};form.onsubmit({preventDefault(){},target:form});assert(!G.settings.content().includes('Feriado prueba eliminar'));assert(!G.attendance.calendar().includes('Feriado prueba eliminar'));});
check('eliminación de usuario por botón y formulario persiste',()=>{G.records.saveUser({fullName:'Usuario prueba',username:'prueba-delete',password:'prueba123',role:'admin'});const u=G.auth.data().users.find(u=>u.username==='prueba-delete');G.app.action({dataset:{action:'user-delete',id:u.id}});assert(!G.repo.read().users.find(x=>x.id===u.id).deletedAt);const form=elements.get('form');form.fields={};form.onsubmit({preventDefault(){},target:form});G.repo.init();assert(G.repo.read().users.find(x=>x.id===u.id).deletedAt);assert(G.repo.read().employees.find(e=>e.id===employeeId).deletedAt);});
console.log(`\n${checks} comprobaciones correctas. Revisión visual pendiente en navegador real.`);
