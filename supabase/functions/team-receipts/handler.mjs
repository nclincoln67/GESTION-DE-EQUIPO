export const MAX_BYTES=5*1024*1024;
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function inspectFile(bytes,name,mime){
  if(!bytes.length||bytes.length>MAX_BYTES)throw fail(413,'Cada comprobante debe pesar entre 1 byte y 5 MB.');
  if(typeof name!=='string'||name.length<1||name.length>180||/[\x00-\x1f\x7f/\\]/.test(name))throw fail(400,'El nombre del archivo no es válido.');
  const ext=name.split('.').at(-1).toLowerCase();
  const type=ext==='pdf'?'application/pdf':ext==='png'?'image/png':['jpg','jpeg'].includes(ext)?'image/jpeg':null;
  const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const pdf=new TextDecoder().decode(bytes.slice(0,5))==='%PDF-';
  if(!type||mime!==type||!(type==='image/png'?png:type==='image/jpeg'?jpeg:pdf))throw fail(415,'Selecciona un PDF, PNG, JPG o JPEG válido.');
  return type;
}
async function readBytes(request){
  if(Number(request.headers.get('content-length'))>MAX_BYTES)throw fail(413,'El comprobante supera los 5 MB.');
  const reader=request.body?.getReader();if(!reader)throw fail(400,'Selecciona un comprobante.');
  const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;
    if(size>MAX_BYTES){await reader.cancel();throw fail(413,'El comprobante supera los 5 MB.');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return bytes;
}
export function createReceiptHandler({verifyToken,access,put,get,origins}){
  return async request=>{
    const origin=request.headers.get('origin'),allowed=!origin||origins.includes(origin);
    const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',
      ...(allowed&&origin?{'Access-Control-Allow-Origin':origin}:{}),
      'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-file-name',
      'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Max-Age':'600'};
    const json=(status,value)=>new Response(JSON.stringify(value),{status,headers:{...headers,'Content-Type':'application/json'}});
    try{
      if(!allowed)throw fail(403,'Origen no permitido.');
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
      if(!['GET','POST'].includes(request.method))throw fail(405,'Método no permitido.');
      const token=/^Bearer ([^\s]+)$/.exec(request.headers.get('authorization')||'')?.[1];
      if(!token)throw fail(401,'Inicia sesión para consultar comprobantes.');
      const actor=await verifyToken(token);
      if(!actor?.userId||!actor.sessionId)throw fail(401,'Tu sesión terminó.');
      const q=new URL(request.url).searchParams,collection=q.get('collection'),record=q.get('record'),id=q.get('id');
      if(!['payments','movements'].includes(collection)||!record||record.length>200||id&&!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))throw fail(400,'Registro inválido.');
      const call=(action,input={})=>access(actor,action,collection,record,id,input);
      if(request.method==='GET'){
        if(!id)return json(200,await call('list'));
        const item=await call('read'),response=await get(item.object_path);
        if(!response.ok)throw fail(502,'No se pudo descargar el comprobante. Intenta nuevamente.');
        return new Response(response.body,{headers:{...headers,'Content-Type':item.mime,
          'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(item.filename)}});
      }
      if(!id)throw fail(400,'Falta el identificador del comprobante.');
      // Autorizar antes de leer el cuerpo; el RPC de reserva revalida sesión y rol.
      await call('upload-check');
      let name;try{name=decodeURIComponent(request.headers.get('x-file-name')||'');}catch{throw fail(400,'Nombre de archivo inválido.');}
      const bytes=await readBytes(request),mime=inspectFile(bytes,name,request.headers.get('content-type'));
      const digest=await crypto.subtle.digest('SHA-256',bytes),sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      const item=await call('reserve',{name,type:mime,size:bytes.length,sha256});
      if(!item.ready_at){await put(item.object_path,bytes,mime);await call('finish');}
      return json(200,{id});
    }catch(error){return json(error.status||400,{error:error.status===502?'No se pudo acceder al archivo. Reintenta la carga o descarga.':error.message});}
  };
}
