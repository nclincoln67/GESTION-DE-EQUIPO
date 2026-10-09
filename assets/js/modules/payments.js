(function (G) {
  const U=G.utils,E=U.escape,B=G.ui;
  G.payments = {
    movementTable(items) {
      const d=G.auth.data(),admin=G.auth.isAdmin();
      return B.table(['Fecha','Persona / concepto','Tipo','Periodo','Monto','Estado',''],[...items].sort((a,b)=>b.date.localeCompare(a.date)).map(m=>{
        const e=d.employees.find(e=>e.id===m.employeeId),type=d.settings.types.find(t=>t.id===m.typeId);
        const nature=G.payroll.movementNature(type);
        const amount=nature==='advance'?`<strong>${U.money(m.amount)}</strong><small>${m.state==='valid'?'Salida · adelanto entregado':'Adelanto anulado · no cuenta'}</small>`:`${nature==='deduction'?'−':'+'} ${U.money(m.amount)}`;
        const status=G.payroll.movementStatus(m,d);
        const blocked=admin&&m.state==='valid'?G.payroll.movementVoidReason(m,d):'';
        const settled=admin&&G.payroll.isMovementSettled(m,d);
        const annul=settled?`<span class="badge gray" title="${E(blocked)}">Liquidado · protegido</span>`:B.button('Anular','record-void','','ghost',`data-id="${m.id}" data-collection="movements" ${blocked?`disabled title="${E(blocked)}"`:''}`);
        return `<tr><td>${U.date(m.date)}</td><td class="cell-note"><strong>${E(e?.fullName)}</strong><small title="${E(m.concept)}">${E(m.concept)}</small></td><td>${E(type?.label)}${m.eventId?' · '+G.icon('calendar'):''}</td><td>${E(m.period)}</td><td class="number cell-note ${nature==='deduction'?'text-red':''}">${amount}</td><td>${B.badge(status)}</td><td><div class="row-actions">${B.button('Ver','record-detail','eye','ghost',`data-id="${m.id}" data-collection="movements"`)}${admin&&m.state==='valid'?annul:''}</div></td></tr>`;
      }),'No hay movimientos registrados para este periodo.');
    },
    paymentTable(items) {
      const d=G.auth.data();
      return B.table(['Fecha','Persona','Periodo','Concepto de pago','Método','Pagado','Estado',''],[...items].sort((a,b)=>b.date.localeCompare(a.date)).map(p=>{
        const collection=p.sourceCollection||'payments',isAdvance=collection==='movements';
        const blocked=p.state==='valid'?(isAdvance?G.payroll.movementVoidReason(p,d):G.payroll.paymentVoidReason(p,d)):'';
        const annul=blocked?`<span class="badge gray" title="${E(blocked)}">Protegido</span>`:B.button('Anular','record-void','','ghost',`data-id="${p.id}" data-collection="${collection}"`);
        return `<tr><td>${U.date(p.date)}</td><td>${E(d.employees.find(e=>e.id===p.employeeId)?.fullName)}</td><td>${E(p.period)}</td><td class="cell-note"><strong>${E(p.paymentKind||(isAdvance?'Adelanto':'Pago'))}</strong>${p.concept?`<small title="${E(p.concept)}">${E(p.concept)}</small>`:''}</td><td>${E(d.settings.methods.find(m=>m.id===p.methodId)?.label||'No registrado')}</td><td class="number">${U.money(p.amount)}</td><td>${B.badge(p.state==='valid'?'Vigente':'Anulado')}</td><td><div class="row-actions">${B.button('Ver','record-detail','eye','ghost',`data-id="${p.id}" data-collection="${collection}"`)}${G.auth.isAdmin()&&p.state==='valid'?annul:''}</div></td></tr>`;
      }));
    },
    filteredContent() {
      const d=G.auth.data(),s=G.state,f=s.filters,q=(f.search||'').toLowerCase(),matches=e=>!q||`${e.fullName} ${e.dni}`.toLowerCase().includes(q);
      if(s.tab==='summary')return B.table(['Persona','Sueldo base','Extras','Descuentos','Estimado','Adelantos pagados','Ya pagado · total','Saldo','Estado',''],G.payroll.rows(s.month).filter(r=>matches(r.employee)&&(!f.status||r.status===f.status)).map(r=>`<tr><td><button type="button" class="row-button" data-action="profile" data-id="${r.employee.id}">${B.person(r.employee,r.employee.position)}</button></td><td>${U.money(r.base)}</td><td>${U.money(r.income)}</td><td class="text-red">− ${U.money(r.deduction)}</td><td><strong>${U.money(r.due)}</strong></td><td>${U.money(r.advances)}</td><td>${U.money(r.paid)}</td><td>${U.money(Math.max(0,r.remaining))}</td><td>${B.badge(r.status)}</td><td>${B.button('Detalle','pay-detail','eye','ghost',`data-id="${r.employee.id}"`)}</td></tr>`));
      const collection=s.tab==='movements'?'movements':'payments';
      const records=collection==='movements'?d.movements:G.payroll.paymentEntries(d);
      const items=records.filter(m=>(f.allPeriods==='true'||m.period===s.month)&&matches(d.employees.find(e=>e.id===m.employeeId))&&(!f.type||m.typeId===f.type)&&(!f.recordState||(collection==='movements'?G.payroll.movementStatus(m,d):m.state)===f.recordState)&&(!f.from||m.date>=f.from)&&(!f.to||m.date<=f.to));
      return collection==='movements'?this.movementTable(items):this.paymentTable(items);
    },
    movementForm(preset='',employeeId='',eventId=null,period=G.state.month,paymentTiming='pending') {
      G.auth.requireAdmin();const d=G.auth.data(),ev=d.events.find(e=>e.id===eventId);
      if(preset)U.assert(d.settings.types.some(t=>t.id===preset&&t.active&&!t.deletedAt),'Este tipo de movimiento fue eliminado o desactivado. Registra el movimiento con otro tipo desde Pagos.');
      if(employeeId)U.assert(G.auth.employees().some(e=>e.id===employeeId),'El trabajador fue eliminado. Solo puedes consultar su historial y completar pagos pendientes.');
      const type=preset||d.settings.types.find(t=>t.active&&!t.deletedAt)?.id,employee=employeeId||G.auth.employees().find(e=>e.active)?.id;
      B.dialog('Registrar movimiento',`${ev?`<div class="inline-note">${G.icon('calendar')}Evento asociado: ${E(ev.type)} · ${U.date(ev.start)}</div>`:''}<div id="movement-effect" class="inline-note"></div><div class="form-grid">${B.field('employeeId','Persona',employee,{choices:B.employeeChoices(employee),required:true,wide:true})}${B.field('typeId','Tipo de movimiento',type,{choices:d.settings.types.filter(t=>t.active).map(t=>[t.id,`${t.label} · ${G.payroll.movementNature(t)==='advance'?'Pago inmediato':t.nature==='income'?'Ingreso adicional':'Descuento'}`]),required:true})}${B.field('amount','Monto (S/)',null,{type:'number',required:true,min:'.01',step:'.01'})}${B.field('date','Fecha',U.today(),{type:'date',required:true,max:U.today()})}${B.field('period','Periodo de pago',period,{type:'month',required:true})}${B.field('concept','Concepto / descripción',ev?.description||ev?.type||'',{required:true,wide:true})}<div id="income-payment-timing" style="grid-column:1/-1">${B.field('paymentTiming','¿Este ingreso ya se pagó?',paymentTiming,{choices:[['pending','No, registrar como pendiente'],['paid','Sí, registrar ingreso y pago juntos']],required:true})}</div><div id="advance-fields" style="grid-column:1/-1"><div class="form-grid">${B.field('methodId','Método del pago',null,{choices:[['','Seleccionar método'],...d.settings.methods.filter(m=>m.active&&!m.deletedAt).map(m=>[m.id,m.label])]})}${B.field('reference','Número de operación del pago',null)}</div></div>${B.field('notes','Observaciones',null,{type:'textarea',wide:true})}</div>`,input=>{if(eventId){input.eventId=eventId;input.employeeId=employee;}return G.records.addMovement(input);},'Registrar movimiento');
      const update=()=>{
        const selected=document.querySelector('#f-typeId').value||type,nature=G.payroll.movementNature(d.settings.types.find(t=>t.id===selected)),income=nature==='income';
        const timing=document.querySelector('#f-paymentTiming');timing.disabled=!income;timing.required=income;
        document.querySelector('#income-payment-timing').hidden=!income;
        const immediate=nature==='advance'||income&&(timing.value||paymentTiming)==='paid';
        document.querySelector('#advance-fields').hidden=!immediate;
        const method=document.querySelector('#f-methodId');method.disabled=!immediate;method.required=immediate;
        document.querySelector('#f-reference').disabled=!immediate;
        document.querySelector('#movement-effect').textContent=nature==='advance'?'Registra únicamente dinero ya entregado. Este pago inmediato reduce el saldo pendiente, no el estimado. No lo registres de nuevo como otro pago.':income?(immediate?'Se registrarán este ingreso y su pago juntos. El dinero ya entregado contará una sola vez. Los movimientos anteriormente liquidados seguirán protegidos.':'Puedes añadir este ingreso aunque el mes ya estuviera pagado. Quedará pendiente y los movimientos anteriores seguirán liquidados y protegidos.'):'Este descuento reduce el importe pendiente, pero no representa dinero entregado ni modifica los movimientos ya liquidados.';
      };
      document.querySelector('#f-typeId').onchange=update;document.querySelector('#f-paymentTiming').onchange=update;update();
    },
    paymentForm(employeeId='',period=G.state.month) {
      G.auth.requireAdmin();const d=G.auth.data(),eligible=G.payroll.rows(period).filter(r=>r.remaining>0);
      if(!eligible.length||employeeId&&!eligible.some(r=>r.employee.id===employeeId)) {
        const person=employeeId||G.auth.employees().find(e=>e.active&&e.joined.slice(0,7)<=period)?.id;
        const type=d.settings.types.find(t=>t.active&&!t.deletedAt&&t.id==='income-other')||d.settings.types.find(t=>t.active&&!t.deletedAt&&G.payroll.movementNature(t)==='income');
        U.assert(person&&type,'Para registrar un pago adicional necesitas una persona y un tipo de ingreso activo.');
        return this.movementForm(type.id,person,null,period,'paid');
      }
      const selected=eligible.find(r=>r.employee.id===employeeId)||eligible[0];
      B.dialog('Registrar pago',`<div id="pay-preview" class="pay-preview"></div><div class="form-grid">${B.field('employeeId','Persona',selected.employee.id,{choices:eligible.map(r=>[r.employee.id,r.employee.fullName]),required:true,wide:true})}${B.field('period','Periodo',period,{type:'month',required:true})}${B.field('amount','Monto a pagar (S/)',selected.remaining,{type:'number',min:'.01',step:'.01',required:true})}${B.field('date','Fecha del pago',U.today(),{type:'date',max:U.today(),required:true})}${B.field('methodId','Método',null,{choices:d.settings.methods.filter(m=>m.active).map(m=>[m.id,m.label]),required:true})}${B.field('reference','Número de operación',null)}${B.field('notes','Observaciones',null,{type:'textarea',wide:true})}</div>`,input=>G.payroll.addPayment(input),'Registrar pago');
      const update=()=>{const form=document.querySelector('#dialog-form'),p=form.elements.period.value; if(!p)return;const r=G.payroll.calculate(form.elements.employeeId.value,p);document.querySelector('#pay-preview').innerHTML=[['Estimado',r.due],['Ya pagado',r.paid],['Saldo pendiente',Math.max(0,r.remaining)]].map(([l,v])=>`<div><small>${l}</small><strong>${U.money(v)}</strong></div>`).join('');form.elements.amount.max=Math.max(0,r.remaining);};
      ['employeeId','period'].forEach(key=>document.querySelector(`#f-${key}`).onchange=update);update();
    },
    detail(employeeId,period=G.state.month) {
      const r=G.payroll.calculate(employeeId,period),d=G.auth.data();
      const canAddMovement=!r.employee.deletedAt;
      const lines=income=>r.movements.filter(m=>G.payroll.movementNature(d.settings.types.find(t=>t.id===m.typeId))===(income?'income':'deduction')).map(m=>`<div class="breakdown-line"><span>${E(d.settings.types.find(t=>t.id===m.typeId)?.label)}</span><strong>${U.money(m.amount)}</strong></div>`).join('');
      B.dialog('Detalle de pago',`<div class="person" style="margin-bottom:22px">${B.person(r.employee,U.monthLabel(period))}${B.badge(r.status)}</div><div class="pay-preview">${[['Estimado',r.due],['Pagado',r.paid],['Pendiente',Math.max(0,r.remaining)]].map(([l,v])=>`<div><small>${l}</small><strong>${U.money(v)}</strong></div>`).join('')}</div>${r.credit?`<div class="inline-note">Existe un excedente de ${U.money(r.credit)} tras un ajuste. Revisa el historial y registra la corrección correspondiente.</div>`:''}<div class="breakdown"><div class="breakdown-box"><h3>Ingresos</h3><div class="breakdown-line"><span>Sueldo base ${r.snapshot?'del periodo':'estimado'}</span><strong>${U.money(r.base)}</strong></div>${lines(true)}<div class="breakdown-line total"><span>Total ingresos</span><span>${U.money(r.base+r.income)}</span></div></div><div class="breakdown-box"><h3>Descuentos reales</h3>${lines(false)||'<p class="subtle-note">Sin descuentos.</p>'}<div class="breakdown-line total"><span>Total descuentos</span><span>${U.money(r.deduction)}</span></div></div></div><div class="pay-preview">${[['Adelantos entregados',r.advances],['Otros pagos',r.otherPaid],['Total ya pagado',r.paid]].map(([l,v])=>`<div><small>${l}</small><strong>${U.money(v)}</strong></div>`).join('')}</div><h3 style="font-size:.9rem;margin-bottom:15px">Pagos realizados, incluidos adelantos</h3>${this.paymentTable(r.payments)}${G.auth.isAdmin()?`<div class="dialog-footer" style="margin-top:22px">${canAddMovement?B.button('Agregar ingreso / movimiento','movement-new','plus','secondary',`data-id="${employeeId}" data-period="${period}"`):''}${r.remaining>0||canAddMovement?B.button(r.remaining>0?'Registrar pago':'Registrar pago adicional','payment-new','wallet','primary',`data-id="${employeeId}" data-period="${period}"`):''}</div>`:''}`);
    },
    recordDetail(collection,id) {
      const d=G.auth.data(),record=d[collection].find(r=>r.id===id);U.assert(record,'No tienes acceso a este registro.');
      const e=d.employees.find(e=>e.id===record.employeeId),author=G.auth.isAdmin()?d.users.find(u=>u.id===record.createdBy)?.fullName:'Administración';
      const status=collection==='movements'?G.payroll.movementStatus(record,d):record.state==='valid'?'Vigente':'Anulado';
      const isAdvance=collection==='movements'&&G.payroll.movementNature(d.settings.types.find(t=>t.id===record.typeId))==='advance';
      const explanation=isAdvance?(record.state==='valid'?'Adelanto entregado: es una salida de dinero y forma parte de Ya pagado. No reduce el estimado del mes.':'Este adelanto fue anulado: se conserva el registro, pero ya no cuenta en Ya pagado.'):collection==='movements'&&status==='Pagado'?'Este movimiento se incluyó en el pago completo del mes. Los descuentos reducen el importe a pagar, pero no son salidas de dinero.':'';
      B.dialog('Detalle del registro',`<div class="pay-preview"><div><small>${E(e.fullName)}</small><strong>${U.money(record.amount)}</strong></div>${B.badge(status)}</div>${explanation?`<div class="inline-note">${E(explanation)}</div>`:''}<dl class="info-list" style="padding:0">${[['Fecha',U.date(record.date)],['Periodo',record.period],['Concepto',record.concept||'Pago realizado'],['Método',d.settings.methods.find(m=>m.id===record.methodId)?.label],['Operación',record.reference],['Observaciones',record.notes],['Registrado por',author],['Motivo de anulación',record.voidReason]].map(([k,v])=>`<div><dt>${E(k)}</dt><dd>${E(v||'—')}</dd></div>`).join('')}</dl>`);
    }
  };
  G.views.payments=function(){
    const admin=G.auth.isAdmin(),s=G.state,t=G.payroll.totals(s.month);
    const recordStates=s.tab==='movements'?['Vigente','Pagado','Anulado']:[['valid','Vigentes'],['void','Anulados']];
    return `${B.heading(admin?'Pagos del equipo':'Mis pagos','Cada movimiento cuenta. Cada saldo, claro.',B.monthControl())}<div class="stats" style="margin-bottom:23px">${B.stat('Estimado del periodo',U.money(t.due),'wallet','Sueldo + ingresos − descuentos','featured')}${B.stat('Ya pagado',U.money(t.paid),'check','Adelantos entregados + otros pagos')}${B.stat('Saldo pendiente',U.money(t.remaining),'clock','Por completar')}${B.stat('Ingresos adicionales',U.money(t.income),'coins','Comisiones, bonos y otros')}</div>${B.tabs([['summary','Resumen mensual'],['movements','Movimientos'],['history','Historial de pagos']],s.tab)}<section class="panel"><div class="toolbar">${B.search(s.filters.search)}${s.tab==='summary'?B.filter('status','Todos los estados',['Pendiente','Pago parcial','Pagado']):B.filter('recordState','Todos los estados',recordStates)}${s.tab==='movements'?B.filter('type','Todos los tipos',G.auth.data().settings.types.map(t=>[t.id,t.label])):''}${s.tab!=='summary'?B.filter('allPeriods','Mes seleccionado',[['true','Todos los periodos']]):''}${s.tab!=='summary'?'<label class="count-label">Desde <input type="date" data-filter="from" value="'+E(s.filters.from||'')+'"></label><label class="count-label">Hasta <input type="date" data-filter="to" value="'+E(s.filters.to||'')+'"></label>':''}${admin?B.button(s.tab==='movements'?'Registrar movimiento':'Registrar pago',s.tab==='movements'?'movement-new':'payment-new','plus'):''}</div>${s.tab==='movements'?'<div class="inline-note">Adelantos: pagos entregados al registrarlos. Comisiones y bonos: pueden quedar pendientes o registrarse junto con su pago. Los movimientos ya liquidados siguen protegidos. Descuentos: reducen el importe a pagar, sin salida de dinero.</div>':''}<div id="filtered-results">${G.payments.filteredContent()}</div>${admin&&s.tab==='summary'?`<footer class="panel-footer"><span>Ya pagado incluye los adelantos: no se suman otra vez. El sueldo se conserva por periodo.</span>${B.button('Preparar periodo','prepare-period','','ghost')}</footer>`:''}</section>`;
  };
})(window.GE);
