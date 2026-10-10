export function createLoginHandler({ resolve, authenticate, origins }) {
  return async request => {
    const origin=request.headers.get('origin'), allowed=!origin||origins.includes(origin);
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin',
      ...(origin&&allowed?{'Access-Control-Allow-Origin':origin}:{}),
      'Access-Control-Allow-Headers':'apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
    const json=(status,body)=>new Response(JSON.stringify(body),{status,headers});
    if(!allowed)return json(403,{error:'Origen no permitido.'});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return json(405,{error:'Método no permitido.'});
    try {
      if(!request.headers.get('content-type')?.startsWith('application/json'))return json(415,{error:'Formato no permitido.'});
      const reader=request.body?.getReader(); if(!reader)return json(400,{error:'Formulario inválido.'});
      let size=0; const chunks=[];
      try { while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;
        if(size>4096){await reader.cancel();return json(413,{error:'Solicitud demasiado grande.'});}chunks.push(value);}
      }finally{reader.releaseLock();}
      const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
      const input=JSON.parse(new TextDecoder().decode(bytes));
      if(typeof input?.identifier!=='string'||input.identifier.trim().length<3||input.identifier.length>254||typeof input.password!=='string'||!input.password||input.password.length>1024)
        return json(400,{error:'Introduce tu correo o usuario y contraseña.'});
      const email=await resolve(input.identifier.trim().toLowerCase(),request);
      if(!email)return json(429,{error:'Demasiados intentos. Espera 15 minutos antes de volver a intentar.'});
      const session=await authenticate(email,input.password);
      if(!session?.access_token||!session?.refresh_token)return json(401,{error:'Usuario o contraseña incorrectos.'});
      // Solo una contraseña comprobada por Supabase Auth permite obtener la sesión.
      return json(200,{access_token:session.access_token,refresh_token:session.refresh_token});
    }catch(error){return json(error instanceof SyntaxError?400:502,{error:error instanceof SyntaxError?'Formulario inválido.':'No se pudo completar el acceso. Intenta nuevamente.'});}
  };
}
