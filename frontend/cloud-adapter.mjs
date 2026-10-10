import { createClient } from '@supabase/supabase-js';
import { installCloudAdapter } from './connection.mjs';
const G=window.GE;
const config=G.cloudConfig;
const link=new URLSearchParams(location.hash.slice(1));
const type=link.get('type');
if(link.get('access_token')&&['invite','recovery'].includes(type))G.authAction=type;
if(link.get('error'))G.authLinkError='El enlace ya no es válido. Solicita otro enlace de acceso.';
const client=createClient(config.url,config.publishableKey,{auth:{
  storage:sessionStorage,storageKey:'inkajus.auth.tab',persistSession:true,autoRefreshToken:true,
  detectSessionInUrl:true,flowType:'implicit'
}});
installCloudAdapter(G,client,config);

client.auth.onAuthStateChange(event=>{
  // Nunca esperar llamadas Auth dentro de este callback: el SDK mantiene su bloqueo.
  if(event==='PASSWORD_RECOVERY')G.authAction='recovery';
  if(event==='SIGNED_OUT'){
    G.clearCloudData();
    setTimeout(()=>{G.ui.close();G.app?.render();},0);
  }
});

const U=G.utils,B=G.ui,E=U.escape,I=G.icon;
G.cloudUI={
  login(){
    if(G.authAction)return this.password();
    document.getElementById('app').innerHTML=`<main class="login-page"><section class="login-story"><div class="brand"><img src="assets/icons/brand.svg" alt=""><div><strong>INKAJUS</strong><small>GESTIÓN DE EQUIPO</small></div></div><div class="story-body"><span class="eyebrow">PERSONAS · PAGOS · ORGANIZACIÓN</span><h1>Un equipo que avanza.<br><span>Todo en su lugar.</span></h1><p>Tu equipo y sus pagos, organizados en un espacio privado.</p><div class="story-summary"><div><strong>05</strong><small>Módulos conectados</small></div><div><strong>01</strong><small>Espacio para tu equipo</small></div></div></div><p class="story-footer">INKAJUS · Gestión de equipo</p></section><section class="login-main"><div class="login-form"><span class="eyebrow">BIENVENIDO A TU ESPACIO</span><h2>Inicia sesión</h2><p>Ingresa con tu correo o usuario y contraseña.</p><form id="login-form"><div class="form-grid">${B.field('identifier','Correo o usuario','',{required:true,wide:true})}${B.field('password','Contraseña','',{type:'password',required:true,wide:true})}</div><div id="login-error" class="form-error" role="alert">${E(G.authLinkError||'')}</div><button type="submit" class="btn btn-primary">${I('lock')}Entrar a mi espacio</button></form><div class="login-foot">${B.button('Olvidé mi contraseña','cloud-recover','','ghost')}<p>Solo acceden las cuentas autorizadas por administración.</p></div></div></section></main>`;
    document.querySelector('#f-identifier').autocomplete='username';document.querySelector('#f-password').autocomplete='current-password';
    document.querySelector('#login-form').onsubmit=async event=>{
      event.preventDefault();const form=event.target,button=form.querySelector('[type="submit"]');if(button.disabled)return;
      button.disabled=true;button.textContent='Ingresando…';
      try{const input=Object.fromEntries(new FormData(form));await G.auth.login(input.identifier,input.password);
        form.reset();G.state.page='home';G.state.profileId=null;G.state.filters={};G.app.render();
      }catch(error){document.querySelector('#login-error').textContent=error.message;button.disabled=false;button.textContent='Entrar a mi espacio';}
    };
  },
  password(){
    document.getElementById('app').innerHTML=`<main class="setup-page"><section class="setup-card"><div class="brand"><img src="assets/icons/brand.svg" alt=""><div><strong>INKAJUS</strong><small>GESTIÓN DE EQUIPO</small></div></div><span class="eyebrow">ACCESO PRIVADO</span><h1>${G.authAction==='invite'?'Activa tu cuenta':'Crea una nueva contraseña'}</h1><p>Usa al menos 12 caracteres. No compartas este enlace ni tu contraseña.</p><form id="cloud-password"><div class="form-grid">${B.field('password','Nueva contraseña','',{type:'password',required:true,wide:true})}${B.field('confirmPassword','Repite la contraseña','',{type:'password',required:true,wide:true})}</div><div id="password-error" class="form-error" role="alert"></div><button type="submit" class="btn btn-primary">${I('check')}Guardar contraseña y entrar</button></form>${B.button('Cancelar y cerrar sesión','cloud-cancel','','ghost')}</section></main>`;
    for(const key of ['password','confirmPassword']){const input=document.querySelector('#f-'+key);input.minLength=12;input.autocomplete='new-password';}
    document.querySelector('#cloud-password').onsubmit=async event=>{
      event.preventDefault();const form=event.target,button=form.querySelector('[type="submit"]');if(button.disabled)return;button.disabled=true;
      try{const input=Object.fromEntries(new FormData(form));U.assert(input.password.length>=12,'Usa al menos 12 caracteres.');
        U.assert(input.password===input.confirmPassword,'Las contraseñas no coinciden.');
        const {error}=await client.auth.updateUser({password:input.password});if(error)throw new Error('No se pudo guardar la contraseña. Comprueba que el enlace siga vigente.');
        form.reset();G.authAction=null;await G.refresh();G.state.page='home';G.app.render();B.toast('Contraseña guardada. Bienvenido a INKAJUS.');
      }catch(error){document.querySelector('#password-error').textContent=error.message;button.disabled=false;}
    };
  },
  recover(){
    B.dialog('Recuperar acceso',`<div class="form-grid">${B.field('email','Correo de tu cuenta','',{type:'email',required:true,wide:true})}<p class="subtle-note wide">Se enviará un enlace privado si el correo corresponde a una cuenta disponible. No necesitas pedir una contraseña a administración.</p></div>`,async input=>{
      const {error}=await client.auth.resetPasswordForEmail(input.email.trim(),{redirectTo:location.origin+'/'});
      if(error)throw new Error('No se pudo solicitar el correo. Intenta más tarde o avisa a administración.');
    },'Enviar enlace','',{success:'Solicitud recibida. Revisa tu correo y la carpeta de spam.'});
  },
  userForm(id=null){
    G.auth.requireAdmin();const d=G.auth.data(),u=G.cloudAccounts.find(u=>u.id===id)||{role:'visitor'};
    B.dialog(id?'Editar cuenta':'Crear cuenta e invitar',`<div class="form-grid">${B.field('fullName','Nombre de la cuenta',u.fullName,{required:true,wide:true})}${B.field('username','Usuario',u.username,{required:true})}${B.field('email','Correo de la cuenta',u.email,{type:'email',required:true})}${B.field('role','Tipo de usuario',u.role,{choices:[['admin','Administrador'],['visitor','Visitante']],required:true})}${B.field('employeeId','Perfil del visitante',u.employeeId,{choices:[['','Seleccionar perfil'],...d.employees.filter(e=>!e.deletedAt).map(e=>[e.id,e.fullName])]})}<p class="subtle-note wide">La persona recibe una invitación y crea su propia contraseña. Cada visitante consulta únicamente el perfil vinculado.</p></div>`,input=>G.records.saveUser({...input,email:id?u.email:input.email},id),'Guardar cuenta');
    if(id)document.querySelector('#f-email').disabled=true;
    const update=()=>{const select=document.querySelector('#f-employeeId');select.disabled=document.querySelector('#f-role').value==='admin';select.required=!select.disabled;};
    document.querySelector('#f-role').onchange=update;update();
  },
  accounts(){
    const d=G.auth.data();return `<section class="panel"><header class="panel-header"><div><h2>Usuarios y acceso</h2><p>Cuentas con correo propio y permisos por perfil.</p></div>${B.button('Crear cuenta','user-new','plus')}</header>${B.table(['Nombre / correo','Usuario','Rol / perfil','Estado',''],G.cloudAccounts.filter(u=>!u.deletedAt).map(u=>`<tr><td><strong>${E(u.fullName)}</strong><small class="muted" style="display:block">${E(u.email)}</small></td><td>${E(u.username)}</td><td>${E(u.role==='admin'?'Administrador':'Visitante')}${u.role==='visitor'?`<small class="muted" style="display:block">${E(d.employees.find(e=>e.id===u.employeeId)?.fullName||'Perfil no disponible')}</small>`:''}</td><td>${B.badge(u.pending?'Pendiente':u.active?'Activo':'Inactivo')}</td><td><div class="row-actions">${B.button('Editar','user-edit','edit','ghost',`data-id="${E(u.id)}"`)}${u.pending?B.button('Enviar invitación','cloud-invite','','ghost',`data-id="${E(u.id)}"`):u.id!==G.auth.current().id?B.button(u.active?'Desactivar':'Activar','user-toggle','','ghost',`data-id="${E(u.id)}"`):''}${u.id!==G.auth.current().id?B.button('Eliminar','user-delete','trash','danger',`data-id="${E(u.id)}"`):''}</div></td></tr>`))}<footer class="panel-footer">Pendiente significa que la cuenta aún no ha entrado a la aplicación. Los correos de invitación y recuperación requieren SMTP configurado en Supabase.</footer></section>`;
  },
  action(button){
    const {action,id}=button.dataset;
    if(action==='cloud-recover')this.recover();
    else if(action==='cloud-cancel')B.complete(()=>G.auth.logout(),()=>{G.authAction=null;G.app.render();},e=>B.toast(e.message,true));
    else if(action==='cloud-invite')B.confirm('Enviar invitación','Se enviará un enlace privado al correo de esta cuenta.',()=>G.sendCloudInvite(id));
    else if(action==='user-toggle')B.confirm('Cambiar acceso','El cambio se comprueba también en las sesiones abiertas.',()=>G.records.toggleUser(id));
    else if(action==='user-delete')B.confirm('Eliminar acceso','La cuenta dejará de acceder a esta aplicación. Los registros financieros se conservan.',()=>G.records.deleteUser(id),true);
    else return false;
    return true;
  }
};
