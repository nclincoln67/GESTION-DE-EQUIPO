(function (G) {
  'use strict';
  const U=G.utils,E=U.escape,I=G.icon;
  let previousFocus=null, saving=false;
  G.ui = {
    button(label,action,icon='',style='primary',attrs='') {return `<button type="button" class="btn btn-${style}" data-action="${action}" ${attrs}>${icon?I(icon):''}<span>${E(label)}</span></button>`;},
    badge(label) { const tone={'Activo':'green','Pagado':'green','Vigente':'blue','Inactivo':'gray','Anulado':'gray','Pendiente':'amber','Pago parcial':'blue','Ingreso':'green','Descuento':'red','Pago inmediato':'blue'}[label]||'gray'; return `<span class="badge ${tone}">${E(label)}</span>`; },
    person(e,subtitle='') {return `<div class="person"><span class="avatar color-${e.color||0}">${E(U.initials(e.fullName))}</span><div><strong>${E(e.fullName)}</strong>${subtitle?`<small>${E(subtitle)}</small>`:''}</div></div>`;},
    empty(message,icon='file') {return `<div class="empty">${I(icon)}<strong>${E(message)}</strong><span>Los registros aparecerán aquí.</span></div>`;},
    heading(title,description,buttons='') {return `<div class="page-heading"><div><h1>${E(title)}</h1><p>${E(description)}</p></div><div class="heading-actions">${buttons}</div></div>`;},
    monthControl() {return `<label class="month-control">${I('calendar')}<input type="month" id="period-selector" aria-label="Seleccionar mes" value="${G.state.month}"></label>`;},
    stat(label,value,icon,note='',className='') {return `<article class="stat ${className}"><div class="stat-top"><span>${E(label)}</span><span class="stat-icon">${I(icon)}</span></div><strong>${E(value)}</strong><small>${E(note)}</small></article>`;},
    table(heads,rows,empty='No hay registros para esta selección.') {return rows.length?`<div class="table-scroll" tabindex="0" role="region" aria-label="Tabla de registros, desplazable horizontalmente"><table><thead><tr>${heads.map(h=>`<th scope="col">${E(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:this.empty(empty);},
    tabs(items,current,action='tab') {return `<div class="tabs" role="tablist">${items.map(([id,label])=>`<button type="button" role="tab" aria-selected="${id===current}" class="${id===current?'active':''}" data-action="${action}" data-id="${id}">${E(label)}</button>`).join('')}</div>`;},
    field(key,label,value='',options={}) {
      const {type='text',required=false,wide=false,choices=null,min='',max='',step=''}=options;
      const attrs=`name="${key}" id="f-${key}" ${required?'required':''}`;
      let control=choices?`<select ${attrs}>${choices.map(c=>{const [v,l]=Array.isArray(c)?c:[c,c];return `<option value="${E(v)}" ${String(v)===String(value)?'selected':''}>${E(l)}</option>`;}).join('')}</select>`:type==='textarea'?`<textarea ${attrs} rows="3">${E(value)}</textarea>`:`<input ${attrs} type="${type}" value="${E(value)}" ${min!==''?`min="${min}"`:''} ${max!==''?`max="${max}"`:''} ${step?`step="${step}"`:''}>`;
      if(type==='password')control=`<div class="password-control">${control}<button type="button" class="password-toggle" data-action="toggle-password" data-id="f-${key}" aria-label="Mostrar contraseña" aria-pressed="false">Mostrar</button></div>`;
      return `<div class="field ${wide?'wide':''}"><label for="f-${key}">${E(label)}${required?' <span>*</span>':''}</label>${control}</div>`;
    },
    employeeChoices(selected='') {return G.auth.employees().filter(e=>e.active||e.id===selected).map(e=>[e.id,e.fullName]);},
    dialog(title,body,onSubmit=null,submit='Guardar',size='',options={}) {
      saving=false;
      previousFocus=document.activeElement;
      const root=document.getElementById('dialog-root');
      root.innerHTML=`<div class="overlay"><section class="dialog ${size}" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><header class="dialog-header"><div><span class="eyebrow">GESTIÓN DE EQUIPO</span><h2 id="dialog-title">${E(title)}</h2></div><button type="button" class="icon-btn" data-action="close-dialog" aria-label="Cerrar">${I('close')}</button></header>${onSubmit?'<form id="dialog-form">':''}<div class="dialog-body">${body}</div>${onSubmit?`<div class="form-error" id="form-error" role="alert"></div><footer class="dialog-footer">${this.button('Cancelar','close-dialog','','secondary')}<button class="btn btn-${options.danger?'danger':'primary'}" type="submit">${I(options.danger?'trash':'check')}${E(submit)}</button></footer></form>`:''}</section></div>`;
      document.body.classList.add('modal-open');
      document.getElementById('app').inert=true;
      root.querySelector('input, select, textarea, .dialog')?.focus();
      if(onSubmit) {
        let submitted=false;
        root.querySelector('form').onsubmit=e=>{
          e.preventDefault();if(submitted)return;
          submitted=true;saving=true;
          const button=root.querySelector('button[type="submit"]'),label=button.innerHTML;
          button.disabled=true;button.textContent='Guardando…';e.target.ariaBusy='true';
          return this.complete(()=>onSubmit(Object.fromEntries(new FormData(e.target))),()=>{
            saving=false;this.close();G.app.render();this.toast(options.success||'Cambios guardados correctamente.');
          },error=>{
            submitted=false;saving=false;button.disabled=false;button.innerHTML=label;e.target.ariaBusy='false';
            const message=root.querySelector('#form-error');message.textContent=error.message;message.tabIndex=-1;message.focus();
          });
        };
      }
    },
    close() {if(saving)return;document.getElementById('dialog-root').innerHTML='';document.body.classList.remove('modal-open');document.getElementById('app').inert=false;previousFocus?.isConnected&&previousFocus.focus();},
    complete(work,success,error) {try{const result=work();return result&&typeof result.then==='function'?result.then(success).catch(error):success(result);}catch(failure){return error(failure);}},
    confirm(title,message,callback,reason=false,options={}) {this.dialog(title,`<p class="confirm-copy">${E(message)}</p>${reason?this.field('reason','Motivo de anulación','',{type:'textarea',required:true}):''}`,input=>callback(input.reason),options.submit||'Confirmar','compact',options);},
    toast(message,error=false) {const root=document.getElementById('toast-root');root.innerHTML=`<div class="toast ${error?'error':''}">${I(error?'info':'check')}${E(message)}</div>`;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>root.innerHTML='',3800);},
    mountFilters(callback) {document.querySelectorAll('[data-filter]').forEach(el=>el.addEventListener(el.tagName==='INPUT'&&el.type==='search'?'input':'change',()=>{G.state.filters[el.dataset.filter]=el.value;callback();}));},
    search(value='',label='Buscar por nombre o DNI') {return `<div class="search">${I('search')}<input type="search" data-filter="search" placeholder="${E(label)}" value="${E(value)}" aria-label="${E(label)}"></div>`;},
    filter(key,label,choices) {return `<select data-filter="${key}" aria-label="${E(label)}"><option value="">${E(label)}</option>${choices.map(c=>{const [v,l]=Array.isArray(c)?c:[c,c];return `<option value="${E(v)}" ${G.state.filters[key]===String(v)?'selected':''}>${E(l)}</option>`;}).join('')}</select>`;}
  };
  document.addEventListener('keydown',event=>{
    const dialog=document.querySelector('.dialog');if(!dialog)return;
    if(event.key==='Escape')G.ui.close();
    if(event.key==='Tab'){
      const els=[...dialog.querySelectorAll('button,input,select,textarea,a[href]')].filter(e=>!e.disabled&&e.offsetParent!==null),first=els[0],last=els.at(-1);
      if(event.shiftKey&&document.activeElement===first){last?.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first?.focus();event.preventDefault();}
    }
  });
})(window.GE);
