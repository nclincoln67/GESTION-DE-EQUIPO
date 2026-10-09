(function (G) {
  'use strict';
  const U=G.utils;
  G.records = {
    audit(d,action,recordId,detail='') { d.audit.push({id:U.uid(),action,recordId,detail,userId:G.auth.current().id,date:new Date().toISOString()}); },
    markDeleted(record) { record.deletedAt=new Date().toISOString();record.deletedBy=G.auth.current().id;record.active=false; },
    deleteEmployee(employeeId) {
      G.auth.requireAdmin();
      G.repo.transaction(d=>{
        const e=d.employees.find(e=>e.id===employeeId&&!e.deletedAt);U.assert(e,'El empleado ya fue eliminado o no existe.');
        this.markDeleted(e);
        d.users.filter(u=>u.role==='visitor'&&u.employeeId===employeeId).forEach(u=>{u.active=false;});
        this.audit(d,'employee-deleted',employeeId,e.fullName);
      });
    },
    deleteUser(recordId) {
      G.auth.requireAdmin();
      G.repo.transaction(d=>{
        const u=d.users.find(u=>u.id===recordId&&!u.deletedAt);U.assert(u,'El usuario ya fue eliminado o no existe.');
        U.assert(u.id!==G.auth.current().id,'No puedes eliminar la cuenta con la que has iniciado sesión.');
        U.assert(!u.active||u.role!=='admin'||d.users.some(x=>x.id!==u.id&&!x.deletedAt&&x.active&&x.role==='admin'),'Debe quedar al menos un administrador activo.');
        this.markDeleted(u);this.audit(d,'user-deleted',recordId,u.fullName);
      });
    },
    deleteCatalog(collection,recordId) {
      G.auth.requireAdmin();U.assert(['types','methods','positions','schedules','holidays'].includes(collection),'Catálogo inválido.');
      G.repo.transaction(d=>{
        const r=d.settings[collection].find(x=>x.id===recordId&&!x.deletedAt);U.assert(r,'El registro ya fue eliminado o no existe.');
        this.markDeleted(r);this.audit(d,'catalog-deleted',recordId,r.label);
      });
    },
    saveEmployee(input,employeeId=null) {
      G.auth.requireAdmin();
      const salary=Number(input.salary),dni=input.dni.trim();
      U.assert(input.fullName.trim().length>=3,'Escribe el nombre completo.');
      U.assert(/^\d{8}$/.test(dni),'El DNI debe tener 8 dígitos.');
      U.assert(!G.repo.read().employees.some(e=>!e.deletedAt&&e.dni===dni&&e.id!==employeeId),'Este DNI ya está registrado.');
      if(employeeId)U.assert(G.repo.read().employees.some(e=>e.id===employeeId&&!e.deletedAt),'No puedes editar un empleado eliminado.');
      U.assert(Number.isFinite(salary)&&salary>=0,'El sueldo debe ser un número positivo o cero.');
      U.assert(input.joined&&input.joined<=U.today(),'La fecha de ingreso debe ser hasta hoy.');
      U.assert(input.phone.trim()&&input.position&&input.scheduleId,'Completa teléfono, cargo y horario.');
      U.assert(input.birthDate===''||input.birthDate<=U.today(),'Revisa la fecha de nacimiento.');
      G.repo.transaction(d=>{
        const e=d.employees.find(e=>e.id===employeeId);
        if(e && e.salary!==salary) G.payroll.ensureSnapshot(d,e.id,U.month());
        const fields={...input,fullName:input.fullName.trim(),dni,salary:U.cents(salary)/100,dayOff:Number(input.dayOff)};
        if(e) Object.assign(e,fields); else d.employees.push({...fields,id:U.uid(),active:true,color:d.employees.length%5});
        this.audit(d,e?'employee-updated':'employee-created',employeeId||d.employees.at(-1).id);
      });
    },
    toggleEmployee(employeeId) {G.auth.requireAdmin();G.repo.transaction(d=>{const e=d.employees.find(e=>e.id===employeeId&&!e.deletedAt);U.assert(e,'Empleado eliminado o no encontrado.');e.active=!e.active;this.audit(d,'employee-state',employeeId,e.active?'Activo':'Inactivo');});},
    addMovement(input) {
      G.auth.requireAdmin();
      const type=G.repo.read().settings.types.find(t=>t.id===input.typeId&&t.active&&!t.deletedAt),e=G.repo.read().employees.find(e=>e.id===input.employeeId&&!e.deletedAt);
      U.assert(e&&type,'Selecciona empleado y tipo de movimiento.');
      U.assert(input.concept.trim(),'Escribe un concepto.');
      U.assert(Number.isFinite(Number(input.amount))&&U.cents(input.amount)>0,'El monto debe ser mayor que cero.');
      U.assert(input.date&&input.date<=U.today(),'Selecciona una fecha hasta hoy.');
      U.assert(/^\d{4}-\d{2}$/.test(input.period)&&input.period>=e.joined.slice(0,7),'Revisa el periodo del movimiento.');
      const result=G.payroll.calculate(e.id,input.period);
      const nature=G.payroll.movementNature(type);
      U.assert(nature==='income'||!G.payroll.isSettled(e.id,input.period),'Este periodo ya está liquidado. Puedes añadir un ingreso adicional, pero no descuentos ni anticipos sin saldo pendiente.');
      const timing=nature==='income'?(input.paymentTiming||'pending'):'pending';
      U.assert(['pending','paid'].includes(timing),'Selecciona si el ingreso está pendiente o ya fue pagado.');
      U.assert(nature!=='deduction'||result.paid<=0||U.cents(result.due)-U.cents(input.amount)>=U.cents(result.paid),'Este descuento dejaría el total por debajo de lo ya pagado. Revisa el pago parcial antes de registrarlo.');
      if(nature==='advance') {
        U.assert(U.cents(input.amount)<=U.cents(result.remaining),'El adelanto no puede superar el saldo pendiente.');
        U.assert(G.auth.data().settings.methods.some(m=>m.id===input.methodId&&m.active&&!m.deletedAt),'Selecciona el método con el que entregaste el adelanto.');
      }
      if(timing==='paid')U.assert(G.auth.data().settings.methods.some(m=>m.id===input.methodId&&m.active&&!m.deletedAt),'Selecciona el método con el que entregaste este pago adicional.');
      if(input.eventId) U.assert(!G.repo.read().movements.some(m=>m.eventId===input.eventId&&m.state==='valid'),'Este evento ya tiene un movimiento vigente.');
      G.repo.transaction(d=>{
        G.payroll.ensureSnapshot(d,e.id,input.period);
        // Guardar la protección anterior ANTES de añadir el nuevo saldo.
        G.payroll.sealMovements(d,e.id,input.period);
        const record={...input,amount:U.cents(input.amount)/100,id:U.uid(),state:'valid',createdBy:G.auth.current().id,createdAt:new Date().toISOString()};
        delete record.settledAt;delete record.paymentId;
        record.paymentTiming=timing;d.movements.push(record);this.audit(d,'movement-created',record.id);
        if(timing==='paid') {
          const payment={id:U.uid(),employeeId:e.id,period:input.period,amount:record.amount,date:input.date,methodId:input.methodId,reference:input.reference||'',notes:input.notes||'',concept:input.concept,movementId:record.id,state:'valid',createdBy:record.createdBy,createdAt:record.createdAt};
          record.paymentId=payment.id;record.settledAt=record.createdAt;
          d.payments.push(payment);this.audit(d,'payment-created',payment.id,'Pago asociado a '+record.id);
        }
        G.payroll.sealMovements(d,e.id,input.period);
      });
    },
    voidRecord(collection,recordId,reason) {
      G.auth.requireAdmin();U.assert(['movements','payments','events'].includes(collection),'Registro no válido.');U.assert(reason.trim().length>=3,'Escribe el motivo de anulación.');
      G.repo.transaction(d=>{const r=d[collection].find(x=>x.id===recordId);U.assert(r&&r.state==='valid','Este registro ya está anulado o no existe.');if(collection!=='events')G.payroll.sealMovements(d,r.employeeId,r.period);if(collection==='movements'){const blocked=G.payroll.movementVoidReason(r,d);U.assert(!blocked,blocked);}if(collection==='payments'){const blocked=G.payroll.paymentVoidReason(r,d);U.assert(!blocked,blocked);}r.state='void';r.voidReason=reason.trim();r.voidBy=G.auth.current().id;r.voidAt=new Date().toISOString();this.audit(d,'record-voided',recordId,reason);if(collection!=='events')G.payroll.sealMovements(d,r.employeeId,r.period);});
    },
    saveEvent(input,recordId=null) {
      G.auth.requireAdmin();const data=G.repo.read();
      U.assert(data.employees.some(e=>e.id===input.employeeId&&!e.deletedAt),'Selecciona un empleado que no haya sido eliminado.');
      U.assert(U.eventTypes.includes(input.type),'Selecciona un tipo de evento.');
      U.assert(input.start&&input.end&&input.end>=input.start,'Revisa las fechas del evento.');
      U.assert(input.type!=='Cambio de día libre'||input.start===input.end,'El cambio de día libre debe indicar un único día.');
      U.assert(!recordId || !data.movements.some(m=>m.eventId===recordId&&m.state==='valid'),'Anula el movimiento asociado antes de modificar este evento.');
      G.repo.transaction(d=>{let r=d.events.find(e=>e.id===recordId);if(r)Object.assign(r,input);else{r={...input,id:U.uid(),state:'valid',createdBy:G.auth.current().id,createdAt:new Date().toISOString()};d.events.push(r);}this.audit(d,recordId?'event-updated':'event-created',r.id);});
    },
    saveUser(input,recordId=null) {
      G.auth.requireAdmin(); const d=G.repo.read();
      U.assert(input.fullName.trim(),'Escribe el nombre.');U.assert(/^[a-zA-Z0-9._-]{3,30}$/.test(input.username),'El usuario necesita de 3 a 30 letras, números, puntos o guiones.');
      U.assert(!d.users.some(u=>!u.deletedAt&&u.username===input.username&&u.id!==recordId),'Este usuario ya existe.');
      if(recordId)U.assert(d.users.some(u=>u.id===recordId&&!u.deletedAt),'No puedes editar un usuario eliminado.');
      U.assert(['admin','visitor'].includes(input.role),'Rol inválido.');
      U.assert(recordId&&!input.password||input.password.length>=6,'La contraseña de demostración necesita al menos 6 caracteres.');
      if(input.role==='visitor') U.assert(d.employees.some(e=>e.id===input.employeeId&&!e.deletedAt),'Vincula el visitante a un empleado que no esté eliminado.');
      const current=d.users.find(u=>u.id===recordId);
      if(current?.role==='admin'&&input.role!=='admin') U.assert(d.users.some(u=>u.id!==recordId&&u.active&&u.role==='admin'),'Debe quedar al menos un administrador activo.');
      G.repo.transaction(d=>{const fields={...input,employeeId:input.role==='visitor'?input.employeeId:null};const u=d.users.find(x=>x.id===recordId);if(u){if(!fields.password)delete fields.password;Object.assign(u,fields);}else d.users.push({...fields,id:U.uid(),active:true});this.audit(d,'user-saved',recordId||d.users.at(-1).id);});
    },
    toggleUser(recordId) {
      G.auth.requireAdmin(); const d=G.repo.read(),u=d.users.find(x=>x.id===recordId&&!x.deletedAt);U.assert(u,'Usuario eliminado o no encontrado.');
      if(!u.active&&u.role==='visitor')U.assert(d.employees.some(e=>e.id===u.employeeId&&!e.deletedAt),'El perfil vinculado fue eliminado. Edita el usuario y vincula otro perfil antes de activarlo.');
      U.assert(u.id!==G.auth.current().id,'No puedes desactivar tu propia sesión.');
      U.assert(!u.active||u.role!=='admin'||d.users.some(x=>x.id!==u.id&&x.active&&x.role==='admin'),'Debe quedar al menos un administrador activo.');
      G.repo.transaction(d=>{const u=d.users.find(x=>x.id===recordId);u.active=!u.active;this.audit(d,'user-state',recordId);});
    },
    saveCompany(input) {G.auth.requireAdmin();U.assert(input.company.trim(),'Escribe el nombre de la empresa.');G.repo.transaction(d=>{Object.assign(d.settings,input,{payDay:Number(input.payDay)});this.audit(d,'company-updated','settings');});},
    saveCatalog(collection,input,recordId=null) {
      G.auth.requireAdmin();U.assert(['types','methods','positions','schedules','holidays'].includes(collection),'Catálogo inválido.');U.assert(input.label?.trim(),'Escribe un nombre.');
      if(recordId)U.assert(G.repo.read().settings[collection].some(r=>r.id===recordId&&!r.deletedAt),'No puedes editar un registro eliminado.');
      if(collection==='schedules')U.assert(input.start&&input.end,'Completa las horas del horario.');
      if(collection==='holidays')U.assert(input.date,'Selecciona una fecha.');
      if(collection==='types'&&!recordId)U.assert(['income','deduction','advance'].includes(input.nature),'Selecciona una naturaleza válida.');
      G.repo.transaction(d=>{const items=d.settings[collection],current=items.find(x=>x.id===recordId);if(current){if(collection==='types')input.nature=current.nature;if(collection==='positions'&&input.label!==current.label)d.employees.filter(e=>e.position===current.label).forEach(e=>e.position=input.label);Object.assign(current,input);}else items.push({...input,id:U.uid(),active:true});this.audit(d,'catalog-saved',recordId||items.at(-1).id);});
    },
    toggleCatalog(collection,recordId) {G.auth.requireAdmin();U.assert(['types','methods','positions','schedules','holidays'].includes(collection),'Catálogo inválido.');G.repo.transaction(d=>{const r=d.settings[collection].find(x=>x.id===recordId&&!x.deletedAt);U.assert(r,'Registro eliminado o no encontrado.');r.active=!r.active;this.audit(d,'catalog-state',recordId);});}
  };
})(window.GE);
