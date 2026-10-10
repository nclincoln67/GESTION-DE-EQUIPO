import { createLoginHandler } from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
Deno.serve(createLoginHandler({
  origins:['https://gestion-de-equipo.pages.dev','http://localhost:8787','http://127.0.0.1:8787'],
  async resolve(identifier:string,request:Request){
    const source=request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
    const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const response=await fetch(`${url}/rest/v1/rpc/team_login_target`,{method:'POST',
      headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({p_identifier:identifier,p_fingerprint:fingerprint})});
    if(!response.ok)throw new Error('Login no disponible');
    return response.json();
  },
  async authenticate(email:string,password:string){
    const response=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',
      headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(!response.ok){if(response.status>=500)throw new Error('Auth no disponible');return null;}
    return response.json();
  }
}));
