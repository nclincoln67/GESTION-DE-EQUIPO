(function(G){
  const E=G.utils.escape,B=G.ui;
  const max=5*1024*1024;
  G.receiptUI={
    field(){return G.receipts?'<div class="receipt-picker field wide"><label for="receipt-files">Comprobantes <span class="receipt-optional">(opcional)</span></label><input id="receipt-files" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" multiple aria-describedby="receipt-help"><small id="receipt-help">PDF, PNG, JPG o JPEG · hasta 5 MB por archivo y 10 por pago.</small><p id="receipt-progress" role="status" aria-live="polite"></p></div>':'';},
    files(){
      const input=document.getElementById('receipt-files');
      const files=input&&!input.disabled?[...input.files]:[];
      G.utils.assert(files.length<=10,'Selecciona hasta 10 comprobantes.');
      for(const f of files){
        G.utils.assert(/\.(pdf|png|jpe?g)$/i.test(f.name),'Selecciona comprobantes PDF, PNG, JPG o JPEG.');
        G.utils.assert(f.size>0&&f.size<=max,`«${f.name}» debe pesar entre 1 byte y 5 MB.`);
        G.utils.assert(f.name.length<=180&&!/[\x00-\x1f\x7f/\\]/.test(f.name),'El nombre de un archivo no es válido.');
      }
      return files;
    },
    // Conserva el destino y los UUID ante un fallo de carga: Reintentar no vuelve a crear el pago.
    submit(save,target=null){
      let saved=!!target,jobs=null;
      return async input=>{
        if(!saved||!jobs)jobs=this.files().map(file=>({file,id:crypto.randomUUID(),done:false}));
        if(!saved){const result=await save(input);target=result?.createdRecord;saved=true;G.app?.render();}
        if(!jobs.length)return;
        const progress=document.getElementById('receipt-progress');
        const form=document.getElementById('dialog-form');
        form?.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=true);
        try{
          G.utils.assert(target,'El pago quedó registrado. Abre su detalle para adjuntar los comprobantes.');
          for(let i=0;i<jobs.length;i++){
            if(jobs[i].done)continue;
            if(progress)progress.textContent=`Pago registrado. Subiendo comprobante ${i+1} de ${jobs.length}…`;
            await G.receipts.upload(target,jobs[i].file,jobs[i].id);jobs[i].done=true;
          }
        }catch(error){
          if(progress)progress.textContent='El pago está guardado. Puedes reintentar los archivos pendientes o cerrar y adjuntarlos desde el detalle.';
          // El diálogo restaura su botón al terminar el rechazo; cambiar la etiqueta después.
          setTimeout(()=>{const button=form?.querySelector('[type="submit"]');if(button?.isConnected)button.textContent='Reintentar comprobantes';},0);
          throw new Error('El pago ya está registrado; no lo registres otra vez. '+error.message);
        }
      };
    },
    target(collection,record){
      if(collection==='payments')return {collection,id:record.id};
      if(collection!=='movements')return null;
      if(record.paymentId)return {collection:'payments',id:record.paymentId};
      const type=G.auth.data().settings.types.find(t=>t.id===record.typeId);
      return G.payroll.movementNature(type)==='advance'?{collection,id:record.id}:null;
    },
    section(){return '<section class="receipt-section" aria-labelledby="receipt-title"><h3 id="receipt-title">Comprobantes</h3><div id="receipt-list" aria-live="polite">Cargando comprobantes…</div></section>';},
    async mount(target){
      const root=document.getElementById('receipt-list');if(!root)return;
      try{
        const {files}=await G.receipts.list(target);if(!root.isConnected)return;
        root.innerHTML=(files.length?'<ul class="receipt-list">'+files.map((f,i)=>`<li><div><strong>${E(f.name)}</strong><small>${E(f.type==='application/pdf'?'PDF':'Imagen')} · ${(f.size/1024).toFixed(0)} KB</small></div><button type="button" class="btn btn-secondary" data-receipt="${i}" aria-label="Descargar ${E(f.name)}">${G.icon('download')}Descargar</button></li>`).join('')+'</ul>':'<p class="subtle-note">Este pago todavía no tiene comprobantes.</p>')+
          (G.auth.isAdmin()&&files.length<10?'<button type="button" id="receipt-add" class="btn btn-secondary">'+G.icon('plus')+'Adjuntar comprobantes</button>':'')+'<p class="receipt-feedback" role="status"></p>';
        root.querySelector('#receipt-add')?.addEventListener('click',()=>B.dialog('Adjuntar comprobantes',`<p class="subtle-note">Se adjuntarán al pago existente. El importe y su estado se conservan.</p>${this.field()}`,this.submit(null,target),'Subir comprobantes'));
        root.querySelectorAll('[data-receipt]').forEach(button=>button.addEventListener('click',async()=>{
          const file=files[Number(button.dataset.receipt)],label=button.innerHTML;button.disabled=true;button.textContent='Descargando…';
          try{const blob=await G.receipts.download(target,file.id);if(!root.isConnected)return;
            const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
          }catch(error){if(root.isConnected)root.querySelector('.receipt-feedback').textContent=error.message;}
          finally{button.disabled=false;button.innerHTML=label;}
        }));
      }catch(error){if(root.isConnected){root.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.className='btn btn-secondary';retry.textContent='Reintentar';retry.onclick=()=>this.mount(target);root.append(retry);}}
    }
  };
})(window.GE);
