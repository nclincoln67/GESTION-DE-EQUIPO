(function (G) {
  'use strict';
  const U=G.utils;
  G.payroll = {
    // Compatibilidad: los adelantos antiguos eran guardados como descuentos.
    movementNature(type) { return type?.id==='advance'?'advance':type?.nature; },
    paymentEntries(data=G.auth.data()) {
      // Un adelanto tiene un único registro; el historial lo muestra sin duplicarlo.
      const advances=data.movements.filter(m=>this.movementNature(data.settings.types.find(t=>t.id===m.typeId))==='advance');
      return [...data.payments.map(p=>({...p,sourceCollection:'payments',paymentKind:'Pago'})),...advances.map(m=>({...m,sourceCollection:'movements',paymentKind:'Adelanto'}))];
    },
    isSettled(employeeId,period,data=G.auth.data()) {
      const result=this.calculate(employeeId,period,data);
      return result.paid>0 && U.cents(result.remaining)<=0;
    },
    isMovementSettled(movement,data=G.auth.data()) {
      return movement.state==='valid'&&(!!movement.settledAt||this.isSettled(movement.employeeId,movement.period,data));
    },
    sealMovements(data,employeeId,period) {
      if(!this.isSettled(employeeId,period,data))return;
      const at=new Date().toISOString();
      data.movements.filter(m=>m.employeeId===employeeId&&m.period===period&&m.state==='valid'&&!m.settledAt).forEach(m=>{m.settledAt=at;});
    },
    paymentVoidReason(payment,data=G.auth.data()) {
      const movement=data.movements.find(m=>m.id===payment.movementId);
      return movement&&this.isMovementSettled(movement,data)?'Este pago está asociado a un movimiento ya liquidado y protegido. No se puede anular.':'';
    },
    movementStatus(movement,data=G.auth.data()) {
      if(movement.state!=='valid')return 'Anulado';
      if(this.movementNature(data.settings.types.find(t=>t.id===movement.typeId))==='advance')return 'Pagado';
      return this.isMovementSettled(movement,data)?'Pagado':'Vigente';
    },
    movementVoidReason(movement,data=G.auth.data()) {
      const result=this.calculate(movement.employeeId,movement.period,data);
      if(this.isMovementSettled(movement,data))return 'Este movimiento ya está liquidado y protegido. No se puede anular, aunque registres nuevos ingresos en el mismo mes.';
      const type=data.settings.types.find(t=>t.id===movement.typeId);
      if(type?.nature==='income'&&result.paid>0&&U.cents(result.due)-U.cents(movement.amount)<U.cents(result.paid))return 'Anular este ingreso dejaría el total por debajo de lo ya pagado. Revisa el pago parcial antes de corregir este movimiento.';
      return '';
    },
    calculate(employeeId,period,data=G.auth.data()) {
      G.auth.requireEmployee(employeeId);
      const e=data.employees.find(x=>x.id===employeeId); U.assert(e,'Empleado no encontrado.');
      const snapshot=data.periods.find(p=>p.employeeId===employeeId&&p.period===period);
      const movements=data.movements.filter(m=>m.employeeId===employeeId&&m.period===period&&m.state==='valid');
      const payments=this.paymentEntries(data).filter(m=>m.employeeId===employeeId&&m.period===period&&m.state==='valid');
      const types=data.settings.types;
      const sum = list=>list.reduce((n,m)=>n+U.cents(m.amount),0);
      const income=sum(movements.filter(m=>this.movementNature(types.find(t=>t.id===m.typeId))==='income'));
      const deduction=sum(movements.filter(m=>this.movementNature(types.find(t=>t.id===m.typeId))==='deduction'));
      const advances=sum(payments.filter(p=>p.paymentKind==='Adelanto')),otherPaid=sum(payments.filter(p=>p.paymentKind==='Pago'));
      const base=U.cents(snapshot?.salary??e.salary),due=base+income-deduction,paid=sum(payments);
      const remaining=due-paid;
      const status=remaining<=0?'Pagado':paid>0?'Pago parcial':'Pendiente';
      return {employee:e,base:base/100,income:income/100,deduction:deduction/100,due:due/100,paid:paid/100,advances:advances/100,otherPaid:otherPaid/100,remaining:remaining/100,status,movements,payments,snapshot:!!snapshot,credit:Math.max(0,-remaining)/100};
    },
    rows(period,data=G.auth.data()) {
      return data.employees.filter(e=>e.joined.slice(0,7)<=period && (e.active||data.periods.some(p=>p.employeeId===e.id&&p.period===period)||data.movements.some(m=>m.employeeId===e.id&&m.period===period)||data.payments.some(p=>p.employeeId===e.id&&p.period===period))).map(e=>this.calculate(e.id,period,data));
    },
    totals(period) { return this.rows(period).reduce((a,r)=>{['base','income','deduction','due','paid','advances','otherPaid'].forEach(k=>a[k]+=r[k]);a.remaining+=Math.max(0,r.remaining);a.pending+=r.remaining>0?1:0;return a;},{base:0,income:0,deduction:0,due:0,paid:0,advances:0,otherPaid:0,remaining:0,pending:0}); },
    ensureSnapshot(d,eid,period) { if(!d.periods.some(x=>x.employeeId===eid&&x.period===period)) {const e=d.employees.find(x=>x.id===eid);d.periods.push({id:`${eid}:${period}`,employeeId:eid,period,salary:e.salary,createdAt:new Date().toISOString()});} },
    prepare(period) { G.auth.requireAdmin(); G.repo.transaction(d=>d.employees.filter(e=>e.active&&e.joined.slice(0,7)<=period).forEach(e=>this.ensureSnapshot(d,e.id,period))); },
    addPayment(input) {
      G.auth.requireAdmin(); U.assert(/^\d{4}-\d{2}$/.test(input.period),'Selecciona un periodo válido.');
      const r=this.calculate(input.employeeId,input.period);const amount=Number(input.amount);
      U.assert(!r.employee.deletedAt||r.snapshot,'El trabajador fue eliminado. Solo se pueden completar pagos de sus periodos ya preparados.');
      U.assert(Number.isFinite(amount)&&U.cents(amount)>0,'El monto debe ser mayor que cero.');
      U.assert(U.cents(amount)<=U.cents(r.remaining),'El pago no puede superar el saldo pendiente.');
      U.assert(input.date && input.date<=U.today(),'Selecciona una fecha de pago hasta hoy.');
      U.assert(G.auth.data().settings.methods.some(m=>m.id===input.methodId&&m.active),'Selecciona un método de pago activo.');
      G.repo.transaction(d=>{this.ensureSnapshot(d,input.employeeId,input.period);const record={...input,amount:U.cents(amount)/100,id:U.uid(),state:'valid',createdBy:G.auth.current().id,createdAt:new Date().toISOString()};d.payments.push(record);G.records.audit(d,'payment-created',record.id);this.sealMovements(d,input.employeeId,input.period);});
    }
  };
})(window.GE);
