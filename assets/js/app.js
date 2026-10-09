(function (G) {
  'use strict';
  const U=G.utils,E=U.escape,B=G.ui,I=G.icon;
  const pages=[['home','Inicio','home'],['team','Equipo','team'],['payments','Pagos','wallet'],['attendance','Asistencia','calendar'],['settings','Configuración','settings']];
  G.app = {
    setupView() {
      document.getElementById('app').innerHTML=`<main class="setup-page"><section class="setup-card"><div class="brand"><img src="assets/icons/brand.svg" alt=""><div><strong>INKAJUS</strong><small>GESTIÓN DE EQUIPO</small></div></div><span class="eyebrow">TU ESPACIO ESTÁ LISTO PARA EMPEZAR</span><h1>Bienvenido, Lincoln</h1><p>Define la contraseña de tu cuenta de administrador. Después podrás añadir tu equipo y sus cuentas de visitante.</p><div class="setup-identity"><strong>Lincoln Cuellar Natividad</strong><span>Usuario: cnlincoln · Administrador</span></div><form id="setup-form"><div class="form-grid">${B.field('password','Crea tu contraseña','',{type:'password',required:true,wide:true})}${B.field('confirmPassword','Repite la contraseña','',{type:'password',required:true,wide:true})}${G.setupTokenRequired?B.field('setupToken','Clave de instalación','',{type:'password',required:true,wide:true}):''}<p class="subtle-note wide">Usa al menos 12 caracteres. Puedes combinar varias palabras que recuerdes.</p><details class="setup-import"><summary>Conservar mi configuración anterior (opcional)</summary><p class="subtle-note">Desde el prototipo anterior, entra en Configuración → Datos y exportación y descarga el archivo. Aquí se usarán únicamente tus tipos, cargos, horarios, métodos y feriados. El equipo, los movimientos y los pagos empezarán vacíos.</p>${B.field('settingsFile','Archivo de configuración o datos','',{type:'file',wide:true})}</details></div><div id="setup-error" class="form-error" role="alert"></div><button type="submit" class="btn btn-primary">${I('check')}Crear mi espacio</button></form></section></main>`;
      document.querySelector('#f-password').autocomplete='new-password';document.querySelector('#f-password').minLength=12;
      document.querySelector('#f-confirmPassword').autocomplete='new-password';document.querySelector('#f-settingsFile').accept='.json,application/json';
      document.querySelector('#setup-form').onsubmit=async event=>{
        event.preventDefault();const form=event.target,button=form.querySelector('button[type="submit"]');if(button.disabled)return;
        button.disabled=true;
        try {
          const input=Object.fromEntries(new FormData(form));U.assert(input.password===input.confirmPassword,'Las contraseñas no coinciden.');
          const file=form.elements.settingsFile.files[0];
          if(file){U.assert(file.size<=20*1024*1024,'El archivo es demasiado grande.');const parsed=JSON.parse(await file.text());input.settings=parsed.data?.settings||parsed.settings;U.assert(input.settings,'Este archivo no contiene una configuración compatible.');}
          delete input.settingsFile;delete input.confirmPassword;
          await G.setup(input);G.state.page='home';this.render();B.toast('Bienvenido a tu espacio INKAJUS.');
        }catch(error){document.querySelector('#setup-error').textContent=error.message;button.disabled=false;}
      };
    },
    navigate(page,tab=null) {
      if(!pages.some(p=>p[0]===page))page='home';
      if(page==='settings')G.auth.requireAdmin();
      G.state.page=page;G.state.tab=tab||({payments:'summary',attendance:'calendar',settings:'company'}[page]||'');G.state.profileId=null;G.state.profileTab='information';G.state.filters={};this.render();
    },
    loginView() {
      if(G.serverMode&&G.setupRequired)return this.setupView();
      document.getElementById('app').innerHTML=`<main class="login-page"><section class="login-story"><div class="brand"><img src="assets/icons/brand.svg" alt=""><div><strong>INKAJUS</strong><small>GESTIÓN DE EQUIPO</small></div></div><div class="story-body"><span class="eyebrow">PERSONAS · PAGOS · ORGANIZACIÓN</span><h1>Un equipo que avanza.<br><span>Todo en su lugar.</span></h1><p>Un espacio para cuidar a tu equipo y mantener claros sus pagos, descansos y movimientos.</p><div class="story-summary"><div><strong>05</strong><small>Módulos conectados</small></div><div><strong>01</strong><small>Espacio para tu equipo</small></div></div></div><p class="story-footer">Pequeños equipos. Una gestión más clara.</p></section><section class="login-main"><div class="login-form"><span class="eyebrow">BIENVENIDO A TU ESPACIO</span><h2>Inicia sesión</h2><p>Ingresa con tu usuario y contraseña.</p><form id="login-form"><div class="form-grid">${B.field('username','Usuario','',{required:true,wide:true})}${B.field('password','Contraseña','',{type:'password',required:true,wide:true})}</div><div class="form-error" id="login-error" role="alert" style="padding:14px 0 0"></div><button type="submit" class="btn btn-primary">${I('lock')}Entrar a mi espacio</button></form>${G.serverMode?'<div class="login-foot">Tu cuenta de INKAJUS te permite consultar la información correspondiente a tu perfil.</div>':`<div class="login-foot"><strong>Explora la demostración</strong><div class="demo-accounts"><button type="button" data-action="demo-login" data-id="admin">Administrador</button><button type="button" data-action="demo-login" data-id="valeria">Visitante</button></div><p class="demo-details">admin / admin123 · admin2 / admin123<br>valeria / visita123</p><p style="margin-top:13px">Prototipo local con datos ficticios. El acceso es una simulación; usa únicamente contraseñas de prueba.</p></div>`}</div></section></main>`;
      document.querySelector('#f-username').autocomplete='username';document.querySelector('#f-password').autocomplete='current-password';
      if(G.serverMode)document.querySelector('#f-username').value='cnlincoln';
      document.querySelector('#login-form').onsubmit=event=>{
        event.preventDefault();const button=event.target.querySelector('button[type="submit"]');if(button.disabled)return;button.disabled=true;
        const fields=Object.fromEntries(new FormData(event.target));
        return B.complete(()=>G.auth.login(fields.username,fields.password),()=>{G.state.page='home';G.state.profileId=null;G.state.filters={};this.render();},error=>{button.disabled=false;document.getElementById('login-error').textContent=error.message;});
      };
    },
    render() {
      const user=G.auth.current();if(!user)return this.loginView();
      if(!G.auth.isAdmin()&&G.state.page==='settings')G.state.page='home';
      const d=G.auth.data(),page=G.state.page,title=pages.find(p=>p[0]===page)[1];
      const body=G.views[page]();
      document.getElementById('app').innerHTML=`<a href="#main-content" class="skip-link">Ir al contenido</a><div class="app-layout"><aside class="sidebar"><div class="brand"><img src="assets/icons/brand.svg" alt=""><div><strong>${E(d.settings.company)}</strong><small>${E(d.settings.subtitle)}</small></div></div><div class="eyebrow nav-caption">ESPACIO DE TRABAJO</div><nav class="nav" aria-label="Navegación principal">${pages.filter(p=>G.auth.isAdmin()||p[0]!=='settings').map(([id,label,icon])=>`<button type="button" class="${id===page?'active':''}" data-action="navigate" data-page="${id}" aria-label="${E(id==='team'&&!G.auth.isAdmin()?'Mi perfil':label)}" title="${E(id==='team'&&!G.auth.isAdmin()?'Mi perfil':label)}" ${id===page?'aria-current="page"':''}>${I(icon)}<span>${id==='team'&&!G.auth.isAdmin()?'Mi perfil':label}</span></button>`).join('')}</nav><div class="side-footer"><div class="local-card"><strong>${I('shield')}${G.serverMode?'Tu espacio INKAJUS':'Prototipo anterior'}</strong><p>${G.serverMode?'Equipo, pagos y asistencia en un solo lugar.':'Datos de prueba conservados en este navegador.'}</p></div><div class="account"><span class="avatar color-0">${E(U.initials(user.fullName))}</span><div class="account-text"><strong>${E(user.fullName)}</strong><small>${user.role==='admin'?'Administrador':'Visitante'}</small></div><button type="button" class="icon-btn" data-action="logout" aria-label="Cerrar sesión" title="Cerrar sesión">${I('logout')}</button></div></div></aside><main class="main" id="main-content" tabindex="-1"><header class="topbar"><div class="breadcrumbs"><span>Gestión de equipo</span>${I('chevron')}<strong>${E(title)}</strong></div><div class="top-meta"><span class="date-label">${U.date(U.today())}</span><span class="local-label">${G.serverMode?'ESPACIO INKAJUS':'PROTOTIPO LOCAL'}</span>${G.serverMode?B.button('Actualizar','refresh','clock','ghost'):''}<button type="button" class="icon-btn mobile-logout" data-action="logout" aria-label="Cerrar sesión">${I('logout')}</button></div></header><div class="content">${body}</div></main></div>`;
      document.title=`${title} · ${d.settings.company}`;
      const month=document.querySelector('#period-selector');if(month)month.onchange=()=>{if(month.value){G.state.month=month.value;this.render();}};
      B.mountFilters(()=>{const result=document.getElementById('filtered-results');if(!result)return;result.innerHTML=page==='team'?G.team.rows():page==='payments'?G.payments.filteredContent():G.attendance.eventTable(G.auth.data().events.filter(ev=>ev.start<=G.state.month+'-31'&&ev.end>=G.state.month+'-01'&&(!G.state.filters.employee||ev.employeeId===G.state.filters.employee)&&(!G.state.filters.type||ev.type===G.state.filters.type)));});
      const company=document.querySelector('#company-form');if(company)company.onsubmit=ev=>{ev.preventDefault();if(ev.target.dataset.saving)return;ev.target.dataset.saving='true';return this.perform(()=>B.complete(()=>G.records.saveCompany(Object.fromEntries(new FormData(ev.target))),()=>{this.render();B.toast('Datos de la empresa actualizados.');},error=>{ev.target.dataset.saving='';throw error;}));};
    },
    perform(callback) {return B.complete(callback,result=>result,error=>B.toast(error.message,true));},
    action(button) {
      const {action,id,collection,page,type,period,tab}=button.dataset;
      const closeAnd=fn=>{B.close();fn();};
      switch(action) {
        case 'close-dialog': B.close();break;
        case 'toggle-password': {const field=document.getElementById(id),show=field.type==='password';field.type=show?'text':'password';button.textContent=show?'Ocultar':'Mostrar';button.ariaLabel=show?'Ocultar contraseña':'Mostrar contraseña';button.ariaPressed=String(show);break;}
        case 'export-data': G.exports.download();break;
        case 'refresh': return B.complete(()=>G.refresh?.(),()=>{this.render();B.toast('Información actualizada.');},error=>B.toast(error.message,true));
        case 'demo-login': document.getElementById('f-username').value=id;document.getElementById('f-password').value=id==='valeria'?'visita123':'admin123';document.getElementById('f-password').focus();break;
        case 'logout': B.close();return B.complete(()=>G.auth.logout(),()=>this.loginView(),error=>B.toast(error.message,true));
        case 'navigate': this.navigate(page,tab);break;
        case 'tab': G.state.tab=id;G.state.filters={};this.render();break;
        case 'profile': G.auth.requireEmployee(id);G.state.page='team';G.state.profileId=id;G.state.profileTab='information';this.render();break;
        case 'profile-tab':G.state.profileTab=id;this.render();break;
        case 'team-back':G.state.profileId=null;this.render();break;
        case 'employee-new':G.team.form();break;
        case 'employee-edit':G.team.form(id);break;
        case 'employee-toggle': {const e=G.auth.employees().find(e=>e.id===id);B.confirm(e.active?'Desactivar persona':'Reactivar persona',`${e.fullName}: se conservará todo su historial.`,()=>G.records.toggleEmployee(id));break;}
        case 'employee-delete': {
          G.auth.requireAdmin();const e=G.auth.employees().find(e=>e.id===id);U.assert(e,'Empleado eliminado o no encontrado.');
          B.confirm('Eliminar trabajador',`${e.fullName} dejará de aparecer en Equipo y en nuevos formularios. Sus pagos, movimientos y asistencia se conservarán en el historial. Los visitantes vinculados perderán el acceso a este perfil.`,()=>B.complete(()=>G.records.deleteEmployee(id),()=>{G.state.profileId=null;},error=>{throw error;}),false,{submit:'Eliminar trabajador',danger:true,success:'Trabajador eliminado de Equipo.'});break;
        }
        case 'movement-new':closeAnd(()=>G.payments.movementForm(type,id,null,period||G.state.month));break;
        case 'payment-new':closeAnd(()=>G.payments.paymentForm(id,period||G.state.month));break;
        case 'pay-detail':G.payments.detail(id,period||G.state.month);break;
        case 'prepare-period': B.confirm('Preparar periodo',`Se conservará el sueldo actual de cada persona activa para ${U.monthLabel(G.state.month)}. Los sueldos ya guardados en este mes no se modifican.`,()=>G.payroll.prepare(G.state.month));break;
        case 'record-detail':G.payments.recordDetail(collection,id);break;
        case 'record-void':{
          G.auth.requireAdmin();
          if(collection==='movements'){const d=G.auth.data(),m=d.movements.find(m=>m.id===id);U.assert(m,'Movimiento no encontrado.');const blocked=G.payroll.movementVoidReason(m,d);U.assert(!blocked,blocked);}
          if(collection==='payments'){const d=G.auth.data(),p=d.payments.find(p=>p.id===id);U.assert(p,'Pago no encontrado.');const blocked=G.payroll.paymentVoidReason(p,d);U.assert(!blocked,blocked);}
          closeAnd(()=>B.confirm('Anular registro','El registro quedará en el historial y dejará de afectar los cálculos. Si es un evento con un movimiento asociado, este movimiento debe revisarse por separado.',reason=>G.records.voidRecord(collection,id,reason),true));break;
        }
        case 'event-new':G.attendance.form();break;
        case 'event-edit':closeAnd(()=>G.attendance.form('',id));break;
        case 'event-detail':G.attendance.detail(id);break;
        case 'event-movement':{const ev=G.auth.data().events.find(e=>e.id===id);U.assert(ev?.state==='valid','El evento está anulado.');const suggested={'Falta':'absence','Feriado trabajado':'holiday','Día libre trabajado':'dayoff'}[ev.type]||'income-other';closeAnd(()=>G.payments.movementForm(suggested,ev.employeeId,ev.id));break;}
        case 'catalog-new':G.settings.catalogForm(collection);break;
        case 'catalog-edit':G.settings.catalogForm(collection,id);break;
        case 'catalog-toggle':B.confirm('Cambiar estado','El registro seguirá disponible en el historial. Los elementos inactivos no aparecerán en nuevos formularios.',()=>G.records.toggleCatalog(collection,id));break;
        case 'catalog-delete': {
          G.auth.requireAdmin();const item=G.auth.data().settings[collection]?.find(r=>r.id===id&&!r.deletedAt);U.assert(item,'Registro eliminado o no encontrado.');
          B.confirm('Eliminar registro',`Se eliminará «${item.label}» de Configuración y de las opciones para nuevos registros. La información que ya lo utiliza se conservará en el historial.`,()=>G.records.deleteCatalog(collection,id),false,{submit:'Eliminar',danger:true,success:'Registro eliminado de Configuración.'});break;
        }
        case 'user-new':G.settings.userForm();break;
        case 'user-edit':G.settings.userForm(id);break;
        case 'user-toggle':B.confirm('Cambiar acceso del usuario','El cambio se aplicará a los siguientes inicios de sesión.',()=>G.records.toggleUser(id));break;
        case 'user-delete': {
          G.auth.requireAdmin();const u=G.auth.data().users.find(u=>u.id===id&&!u.deletedAt);U.assert(u,'Usuario eliminado o no encontrado.');
          B.confirm('Eliminar usuario',`Se eliminará la cuenta «${u.username}» y ya no podrá iniciar sesión. Los registros realizados por ${u.fullName} conservarán su autoría en el historial.`,()=>G.records.deleteUser(id),false,{submit:'Eliminar usuario',danger:true,success:'Usuario eliminado.'});break;
        }
      }
    }
  };
  document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button)G.app.perform(()=>G.app.action(button));});
  // Mostrar un error útil en vez de una pantalla vacía si el almacenamiento no está disponible.
  B.complete(()=>G.repo.init(),()=>G.app.render(),error=>{document.getElementById('app').innerHTML=`<main class="startup"><h1>No se pudo abrir el espacio</h1><p>${E(error.message)}</p><p>${G.serverMode?'Abre INICIAR-INKAJUS.cmd y vuelve a cargar esta página.':'Comprueba que el navegador permita guardar datos locales y vuelve a abrir index.html.'}</p></main>`;});
})(window.GE);
