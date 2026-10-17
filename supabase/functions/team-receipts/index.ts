import {createReceiptHandler} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={apikey:key,Authorization:`Bearer ${key}`};
const fail=(status:number,message:string)=>Object.assign(new Error(message),{status});
Deno.serve(createReceiptHandler({
  async verifyToken(token:string){
    const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
    if(!response.ok)throw fail(401,'Tu sesión terminó. Inicia sesión nuevamente.');
    const user=await response.json();let claims;
    try{claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{throw fail(401,'Sesión inválida.');}
    if(claims.sub!==user.id||typeof claims.session_id!=='string')throw fail(401,'Sesión inválida.');
    return {userId:user.id,sessionId:claims.session_id};
  },
  async access(actor:{userId:string;sessionId:string},action:string,collection:string,record:string,id:string|null,input:unknown){
    const response=await fetch(`${url}/rest/v1/rpc/team_receipt_access`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},
      body:JSON.stringify({p_actor:actor.userId,p_session:actor.sessionId,p_action:action,p_collection:collection,p_record:record,p_id:id,p_input:input})});
    const result=await response.json();if(response.ok)return result;
    const errors:Record<string,string>={TEAM_RECEIPT_LIMIT:'Este pago ya tiene 10 comprobantes, incluidas las cargas pendientes.',TEAM_RECEIPT_CAPACITY:'El espacio de comprobantes está lleno. Contacta al administrador.',TEAM_RECEIPT_TARGET:'Solo se adjuntan comprobantes a pagos realizados.',TEAM_RECEIPT_CONFLICT:'El archivo de este intento cambió. Selecciónalo nuevamente.',TEAM_RECEIPT_INVALID:'El archivo no es válido.',TEAM_RECEIPT_MISSING:'El archivo no terminó de subir. Reintenta la carga.'};
    if(['TEAM_ACCESS_DENIED','TEAM_SESSION_EXPIRED'].includes(result.message))throw fail(403,'No tienes acceso a este comprobante o tu sesión terminó.');
    throw fail(errors[result.message]?400:502,errors[result.message]||'Almacenamiento no disponible.');
  },
  async put(path:string,bytes:Uint8Array,mime:string){
    const response=await fetch(`${url}/storage/v1/object/team-receipts/${path}`,{method:'POST',headers:{...headers,'Content-Type':mime,'x-upsert':'false','Cache-Control':'no-store'},body:bytes});
    if(response.ok)return;
    // El UUID reservado y su hash son inmutables: un reintento puede encontrar la misma carga.
    let result;try{result=await response.json();}catch{throw fail(502,'No se pudo subir el archivo.');}
    if(result.error==='Duplicate'||result.code==='Duplicate')return;
    throw fail(502,'No se pudo subir el archivo.');
  },
  get:(path:string)=>fetch(`${url}/storage/v1/object/authenticated/team-receipts/${path}`,{headers}),
  origins:['https://gestion-de-equipo.pages.dev','http://localhost:8787','http://127.0.0.1:8787'],
}));
