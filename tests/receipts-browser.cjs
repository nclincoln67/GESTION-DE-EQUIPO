// Prueba visual aislada con datos ficticios. Requiere Playwright; no usa cuentas ni servicios reales.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const output=process.env.RECEIPT_SCREENSHOTS||fs.mkdtempSync(path.join(os.tmpdir(),'inkajus-receipts-'));
const sample=process.env.RECEIPT_SAMPLE;
const sampleBytes=sample?fs.readFileSync(sample):Buffer.from('%PDF-1.7\n%%EOF');
const sampleType=sample?'image/jpeg':'application/pdf',sampleName=sample?'Comprobante de prueba.jpg':'Comprobante de prueba.pdf';
let receiptHandler,stored=null,putAttempts=0;
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name==='/fixture-upload'){
    (async()=>{const chunks=[];for await(const part of req)chunks.push(part);
      const response=await receiptHandler(new Request('http://localhost/fixture-upload'+new URL(req.url,'http://localhost').search,
        {method:'POST',headers:req.headers,body:Buffer.concat(chunks)}));
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    })().catch(error=>res.writeHead(500).end(error.message));return;
  }
  if(name==='/'||name==='/index.html'){
    res.setHeader('content-type','text/html');res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script src="assets\/js\/data\/server-adapter.js"><\/script>/,''));return;
  }
  const target=path.resolve(root,'.'+name);
  if(!target.startsWith(path.join(root,'assets')+path.sep)||!fs.existsSync(target)){res.writeHead(404).end();return;}
  res.setHeader('content-type',name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'text/javascript');res.end(fs.readFileSync(target));
});
(async()=>{
  const origins=[];
  const {createReceiptHandler}=await import('../supabase/functions/team-receipts/handler.mjs');
  receiptHandler=createReceiptHandler({origins,verifyToken:async()=>({userId:'fixture-admin',sessionId:'fixture-session'}),
    access:async(_actor,action,_collection,_record,_id,input)=>{if(action==='reserve')return {object_path:'fixture',ready_at:null};if(action==='finish')assert.deepEqual(stored,sampleBytes);return {};},
    put:async(_path,bytes)=>{putAttempts++;if(putAttempts===1)throw Object.assign(Error('Prueba de conexión interrumpida'),{status:502});stored=Buffer.from(bytes);},get:async()=>new Response(stored)});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origins.push('http://127.0.0.1:'+server.address().port);
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.locator('[data-action="demo-login"][data-id="admin"]').click();
    await page.locator('#login-form button[type="submit"]').click();
    await page.evaluate(()=>{
      const G=window.GE;G.state.month='2026-09';G.app.navigate('payments');
      const original=G.payroll.addPayment.bind(G.payroll);window.fixtureUploads=0;window.fixtureSaves=0;
      G.payroll.addPayment=async input=>{window.fixtureSaves++;original(input);return {createdRecord:{collection:'payments',id:G.auth.data().payments.at(-1).id}};};
      G.receipts={list:async()=>({files:[]}),upload:async(target,file,id)=>{window.fixtureUploads++;const response=await fetch('/fixture-upload?'+new URLSearchParams({collection:target.collection,record:target.id,id}),{method:'POST',headers:{authorization:'Bearer fixture','content-type':file.type,'x-file-name':encodeURIComponent(file.name)},body:file});if(!response.ok)throw Error((await response.json()).error);},download:async()=>new Blob(['%PDF-1.7\n%%EOF'],{type:'application/pdf'})};
    });
    await page.locator('[data-action="payment-new"]').first().click();
    await page.locator('#f-amount').fill('1');
    await page.locator('#receipt-files').setInputFiles({name:sampleName,mimeType:sampleType,buffer:sampleBytes});
    await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:390,height:844});
    await page.locator('#receipt-files').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true,animations:'disabled'});
    assert.equal(await page.locator('.dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
    await page.locator('#dialog-form button[type="submit"]').click();
    await page.getByText('El pago ya está registrado; no lo registres otra vez.',{exact:false}).waitFor();
    assert.equal(await page.evaluate(()=>window.fixtureSaves),1);
    await page.getByRole('button',{name:'Reintentar comprobantes',exact:true}).click();
    await page.locator('.dialog').waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>window.fixtureSaves),1);
    assert.equal(await page.evaluate(()=>window.fixtureUploads),2);
    assert.deepEqual(stored,sampleBytes);
    await page.evaluate(()=>{document.getElementById('toast-root').innerHTML='';});
    // Pagos anteriores y nombres largos: lista y descarga; sin cambiar el registro financiero.
    await page.evaluate(()=>{const G=window.GE;G.receipts.list=async()=>({files:[{id:'fixture',name:'Comprobante de transferencia bancaria del mes de setiembre.pdf',type:'application/pdf',size:20480}]});G.payments.recordDetail('payments',G.auth.data().payments.at(-1).id);});
    await page.getByRole('button',{name:/Descargar Comprobante/}).waitFor();
    await page.locator('#receipt-list').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output,'mobile-detail.png'),fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:path.join(output,'desktop-detail.png'),fullPage:true,animations:'disabled'});
    const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:/Descargar Comprobante/}).click();await downloaded;
    assert.deepEqual(errors,[]);
    console.log('OK navegador: selector, pago único, reintento, detalle y descarga; sin errores JS. Capturas: '+output);
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
