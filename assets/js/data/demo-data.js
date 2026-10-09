(function (G) {
  'use strict';
  // Solo datos inventados. Los días de feriado son editables y no un calendario legal.
  G.createDemo = function () {
    const month = G.utils.month(), at = day => `${month}-${String(Math.min(day,Number(G.utils.today().slice(-2)))).padStart(2,'0')}`;
    const prior=new Date(month+'-01T12:00:00');prior.setMonth(prior.getMonth()-1);
    const previousMonth=`${prior.getFullYear()}-${String(prior.getMonth()+1).padStart(2,'0')}`;
    const specs = [
      ['emp-1','Valeria Cárdenas','Ejecutiva de ventas',1800,0,'Ventas y seguimiento de clientes'],
      ['emp-2','Mateo Salazar','Asesor comercial',1500,1,'Atención comercial'],
      ['emp-3','Camila Rojas','Coordinadora de operaciones',2100,2,'Coordinación de pedidos'],
      ['emp-4','Diego Paredes','Auxiliar de logística',1400,3,'Despacho y control de inventario'],
      ['emp-5','Luciana Vega','Especialista de marketing',1900,4,'Campañas y contenidos'],
      ['emp-6','Andrés Torres','Atención al cliente',1600,5,'Seguimiento posventa'],
      ['emp-7','Sofía Medina','Asistente administrativa',1750,6,'Documentación y soporte'],
      ['emp-8','Gabriel Flores','Auxiliar de logística',1400,0,'Preparación de pedidos']
    ];
    const employees = specs.map(([id,fullName,position,salary,dayOff,functions], i) => ({id,fullName,position,salary,dayOff,functions,dni:`9000000${i+1}`,phone:`900 000 00${i+1}`,email:`persona${i+1}@example.com`,address:'',birthDate:'',joined:`2025-${String(i+1).padStart(2,'0')}-05`,scheduleId:'schedule-1',active:i!==7,observations:'',color:i%5}));
    const types = [
      ['commission','Comisión','income'],['bonus','Bono','income'],['holiday','Feriado trabajado','income'],['dayoff','Día libre trabajado','income'],['overtime','Hora extra','income'],['refund','Reembolso','income'],['income-other','Otro ingreso','income'],
      ['advance','Adelanto','advance'],['discount','Descuento','deduction'],['absence','Falta','deduction'],['loan','Préstamo','deduction'],['deduction-other','Otro descuento','deduction']
    ].map(([id,label,nature])=>({id,label,nature,active:true}));
    const movements = [
      ['emp-1','commission',240,18,'Comisión de ventas del mes'],['emp-1','advance',400,10,'Adelanto solicitado'],['emp-2','commission',180,20,'Ventas del periodo'],['emp-2','advance',200,8,'Adelanto personal'],
      ['emp-3','bonus',250,22,'Bono por coordinación'],['emp-4','discount',70,16,'Ajuste del periodo'],['emp-5','bonus',200,21,'Bono de campaña'],['emp-6','advance',300,12,'Adelanto solicitado'],['emp-7','refund',85,19,'Reembolso de materiales']
    ].map(([employeeId,typeId,amount,day,concept],i)=>({id:`mov-${i+1}`,employeeId,typeId,amount,date:at(day),period:month,concept,notes:'',state:'valid',createdBy:'admin-1',createdAt:new Date().toISOString(),eventId:null}));
    const periods = employees.filter(e=>e.active).map(e=>({id:`${e.id}:${month}`,employeeId:e.id,period:month,salary:e.salary,createdAt:new Date().toISOString()}));
    employees.slice(0,3).forEach(e=>periods.push({id:`${e.id}:${previousMonth}`,employeeId:e.id,period:previousMonth,salary:e.salary,createdAt:new Date().toISOString()}));
    const payments=[{id:'pay-1',employeeId:'emp-3',period:month,amount:1000,date:at(25),methodId:'transfer',reference:'DEMO-001',notes:'Primer pago del mes',state:'valid',createdBy:'admin-1'}, {id:'pay-2',employeeId:'emp-7',period:month,amount:1835,date:at(28),methodId:'transfer',reference:'DEMO-002',notes:'Pago completo',state:'valid',createdBy:'admin-2'}];
    employees.slice(0,3).forEach((e,i)=>payments.push({id:`pay-prior-${i}`,employeeId:e.id,period:previousMonth,amount:e.salary,date:`${previousMonth}-28`,methodId:'transfer',reference:`DEMO-ANT-${i}`,notes:'Pago del mes anterior',state:'valid',createdBy:'admin-1'}));
    return {schemaVersion:1, employees, movements, periods, payments,
      events:[{id:'evt-1',employeeId:'emp-4',type:'Permiso',start:at(14),end:at(14),description:'Permiso personal',notes:'',state:'valid'},{id:'evt-2',employeeId:'emp-1',type:'Día libre trabajado',start:at(20),end:at(20),description:'Apoyo comercial',notes:'',state:'valid'}],
      // DEMO: contraseñas visibles, reemplazar por sesiones y hash en backend al publicar.
      users:[{id:'admin-1',fullName:'Elena Vargas',username:'admin',password:'admin123',role:'admin',active:true,employeeId:null},{id:'admin-2',fullName:'Pablo Reyes',username:'admin2',password:'admin123',role:'admin',active:true,employeeId:null},{id:'visitor-1',fullName:'Valeria Cárdenas',username:'valeria',password:'visita123',role:'visitor',active:true,employeeId:'emp-1'}],
      settings:{company:'INKAJUS',subtitle:'Gestión de equipo',ruc:'',phone:'',address:'',payDay:30,types,methods:[['cash','Efectivo'],['transfer','Transferencia'],['yape','Yape'],['plin','Plin'],['other','Otro']].map(([id,label])=>({id,label,active:true})),positions:[...new Set(employees.map(e=>e.position))].map((label,i)=>({id:`position-${i}`,label,active:true})),schedules:[{id:'schedule-1',label:'Horario general',start:'09:00',end:'18:00',active:true}],holidays:[]},audit:[]};
  };
})(window.GE);
