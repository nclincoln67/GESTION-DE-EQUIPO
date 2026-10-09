(function (G) {
  const U=G.utils,E=U.escape,B=G.ui;
  G.attendance = {
    daysOff(date,d=G.auth.data()) {
      const current=new Date(date+'T12:00:00'),weekday=current.getDay();
      const weekStart=new Date(current);weekStart.setDate(current.getDate()-weekday);const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+6);
      return d.employees.filter(e=>{if(!e.active)return false;const changed=d.events.filter(ev=>ev.employeeId===e.id&&ev.state==='valid'&&ev.type==='Cambio de día libre'&&new Date(ev.start+'T12:00:00')>=weekStart&&new Date(ev.start+'T12:00:00')<=weekEnd).sort((a,b)=>b.createdAt?.localeCompare(a.createdAt||'')||0)[0];return changed?changed.start===date:e.dayOff===weekday;});
    },
    eventTable(items) {
      const d=G.auth.data(),admin=G.auth.isAdmin();
      return B.table(['Fecha','Persona','Evento','Pago asociado','Estado',''],[...items].sort((a,b)=>b.start.localeCompare(a.start)).map(ev=>{
        const e=d.employees.find(e=>e.id===ev.employeeId),move=d.movements.find(m=>m.eventId===ev.id&&m.state==='valid');
        return `<tr><td>${U.date(ev.start)}${ev.start!==ev.end?`<small class="muted" style="display:block">hasta ${U.date(ev.end)}</small>`:''}</td><td>${E(e?.fullName)}</td><td>${E(ev.type)}</td><td>${move?U.money(move.amount):'—'}</td><td>${B.badge(ev.state==='valid'?'Vigente':'Anulado')}</td><td><div class="row-actions">${B.button('Ver','event-detail','eye','ghost',`data-id="${ev.id}"`)}${admin&&ev.state==='valid'&&!move?B.button('Asociar pago','event-movement','','ghost',`data-id="${ev.id}"`):''}</div></td></tr>`;
      }),'No hay eventos en este periodo.');
    },
    calendar() {
      const d=G.auth.data(),month=G.state.month,start=new Date(month+'-01T12:00:00'),count=new Date(start.getFullYear(),start.getMonth()+1,0).getDate(),blank=(start.getDay()+6)%7;
      const cells=Array.from({length:blank},()=>'<div class="calendar-cell blank"></div>');
      for(let day=1;day<=count;day++){
        const date=`${month}-${String(day).padStart(2,'0')}`,events=d.events.filter(ev=>ev.state==='valid'&&ev.start<=date&&ev.end>=date),offs=this.daysOff(date,d),holidays=d.settings.holidays.filter(h=>h.active&&h.date===date);
        cells.push(`<div class="calendar-cell ${date===U.today()?'today':''}"><span class="day-number">${day}</span>${holidays.map(h=>`<span class="calendar-item holiday" title="${E(h.label)}">${E(h.label)}</span>`).join('')}${events.map(ev=>`<button type="button" class="calendar-item" data-action="event-detail" data-id="${ev.id}" title="${E(ev.type+' · '+d.employees.find(e=>e.id===ev.employeeId)?.fullName)}">${E(ev.type+' · '+d.employees.find(e=>e.id===ev.employeeId)?.fullName.split(' ')[0])}</button>`).join('')}${offs.map(e=>`<span class="calendar-item off" title="Día libre de ${E(e.fullName)}">Libre · ${E(e.fullName.split(' ')[0])}</span>`).join('')}</div>`);
      }
      while(cells.length%7)cells.push('<div class="calendar-cell blank"></div>');
      const monthEvents=d.events.filter(ev=>ev.state==='valid'&&ev.start<=month+'-31'&&ev.end>=month+'-01');
      return `<div class="calendar-layout"><section class="panel"><header class="panel-header"><h2 style="text-transform:capitalize">${E(U.monthLabel(month))}</h2><span class="count-label">${monthEvents.length} eventos</span></header><div class="calendar-scroll" tabindex="0" role="region" aria-label="Calendario mensual desplazable"><div class="calendar-grid">${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(l=>`<div class="calendar-day-name">${l}</div>`).join('')}${cells.join('')}</div></div><footer class="calendar-legend"><span class="holiday">Feriado</span><span class="off">Día libre</span><span>Evento</span></footer></section><div class="stack"><section class="panel"><header class="panel-header"><h2>Este mes</h2></header><div class="panel-body mini-people">${monthEvents.slice(0,6).map(ev=>`<div><strong style="font-size:.8rem">${E(d.employees.find(e=>e.id===ev.employeeId)?.fullName)}</strong><p class="subtle-note">${E(ev.type)} · ${U.date(ev.start)}</p></div>`).join('')||'<p class="subtle-note">Sin eventos registrados.</p>'}</div></section><section class="note-card">${G.icon('leaf')}<h3>Una asistencia sencilla</h3><p>Registra las excepciones que importan. El día libre habitual aparece automáticamente.</p></section></div></div>`;
    },
    form(employeeId='',recordId=null) {
      G.auth.requireAdmin();const d=G.auth.data(),ev=d.events.find(e=>e.id===recordId)||{employeeId,start:U.today(),end:U.today()};
      B.dialog(recordId?'Editar evento':'Registrar evento',`<div class="form-grid">${B.field('employeeId','Persona',ev.employeeId,{choices:B.employeeChoices(ev.employeeId),required:true,wide:true})}${B.field('type','Tipo de evento',ev.type,{choices:U.eventTypes,required:true,wide:true})}${B.field('start','Desde',ev.start,{type:'date',required:true})}${B.field('end','Hasta',ev.end,{type:'date',required:true})}${B.field('description','Descripción',ev.description,{wide:true})}${B.field('notes','Observaciones',ev.notes,{type:'textarea',wide:true})}<p class="subtle-note wide">El pago se asocia después de guardar, indicando el monto. Para un cambio de día libre, selecciona el nuevo día en ambas fechas: sustituirá el descanso habitual de esa semana (domingo a sábado).</p></div>`,input=>G.records.saveEvent(input,recordId),'Guardar evento');
    },
    detail(recordId) {
      const d=G.auth.data(),ev=d.events.find(e=>e.id===recordId);U.assert(ev,'No tienes acceso a este evento.');const e=d.employees.find(e=>e.id===ev.employeeId),move=d.movements.find(m=>m.eventId===ev.id&&m.state==='valid');
      B.dialog(ev.type,`${B.person(e,U.date(ev.start)+(ev.end!==ev.start?' — '+U.date(ev.end):''))}<div style="margin:20px 0">${B.badge(ev.state==='valid'?'Vigente':'Anulado')}</div><p class="confirm-copy">${E(ev.description||'Sin descripción.')}</p><p class="subtle-note">${E(ev.notes||'')}${ev.voidReason?'Motivo de anulación: '+E(ev.voidReason):''}</p>${move?`<div class="inline-note" style="margin-top:20px">Movimiento económico asociado: ${U.money(move.amount)}. Anular un evento no anula automáticamente su movimiento; revísalo en Pagos.</div>`:''}${G.auth.isAdmin()&&ev.state==='valid'?`<div class="dialog-footer" style="margin-top:20px">${!move?B.button('Editar','event-edit','edit','secondary',`data-id="${recordId}"`):''}${B.button('Anular','record-void','','danger',`data-id="${recordId}" data-collection="events"`)}${!move?B.button('Asociar movimiento','event-movement','plus','primary',`data-id="${recordId}"`):''}</div>`:''}`);
    }
  };
  G.views.attendance=function(){
    const d=G.auth.data(),s=G.state,tab=s.tab==='events'?'events':'calendar',events=d.events.filter(e=>e.start<=s.month+'-31'&&e.end>=s.month+'-01'&&(!s.filters.employee||e.employeeId===s.filters.employee)&&(!s.filters.type||e.type===s.filters.type));
    return `${B.heading(G.auth.isAdmin()?'Asistencia y descansos':'Mi asistencia','Los eventos que importan, sin marcaciones complicadas.',B.monthControl()+ (G.auth.isAdmin()?B.button('Registrar evento','event-new','plus'):''))}${B.tabs([['calendar','Calendario'],['events','Lista de eventos']],tab)}${tab==='calendar'?G.attendance.calendar():`<section class="panel"><div class="toolbar">${B.filter('employee','Todas las personas',d.employees.map(e=>[e.id,e.fullName]))}${B.filter('type','Todos los eventos',U.eventTypes)}</div><div id="filtered-results">${G.attendance.eventTable(events)}</div></section>`}`;
  };
})(window.GE);
