// Adaptador comprobable sin navegador, SDK ni credenciales reales.
export function installCloudAdapter(G,client,config,fetcher=fetch){
  G.cloudMode=true;G.serverMode=true;G.cloudAccounts=[];
  let data=null,user=null,revision=0,queue=Promise.resolve();
  G.clearCloudData=()=>{data=null;user=null;revision=0;G.cloudAccounts=[];};
  const apply=result=>{if(Object.hasOwn(result,'data'))data=result.data;
    if(Object.hasOwn(result,'user'))user=result.user;
    if(Object.hasOwn(result,'revision'))revision=result.revision;
    if(Object.hasOwn(result,'accounts'))G.cloudAccounts=result.accounts;
    if(result.notice)G.ui?.toast(result.notice,!!result.noticeError);
    return result;
  };
  async function api(payload){
    const {data:authData,error}=await client.auth.getSession();
    if(error||!authData.session){G.clearCloudData();throw new Error('Tu sesión terminó. Inicia sesión nuevamente.');}
    let response;
    try{response=await fetcher(config.url+'/functions/v1/team-api',{
      method:payload===undefined?'GET':'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+authData.session.access_token,
        ...(payload===undefined?{}:{'Content-Type':'application/json'})},body:payload===undefined?undefined:JSON.stringify(payload)});
    }catch{throw new Error('No se pudo conectar. Comprueba tu conexión a internet.');}
    let result;try{result=await response.json();}catch{throw new Error('El servicio no está disponible. Intenta nuevamente.');}
    if(response.ok||response.status===409)apply(result);
    if(!response.ok){if([401,403].includes(response.status)){G.clearCloudData();G.app?.render();}
      throw new Error(result.error||'No se pudo completar la operación.');}
    return result;
  }
  const command=(name,args)=>{
    const operation=queue.then(()=>api({command:name,args,revision}));queue=operation.catch(()=>{});return operation;
  };
  G.repo={
    async init(){const {data:authData,error}=await client.auth.getSession();
      if(globalThis.location?.hash&&/access_token|refresh_token|error=/.test(location.hash))history.replaceState(null,'',location.pathname+location.search);
      if(error){G.authLinkError='El enlace o la sesión ya no son válidos. Solicita otro enlace.';G.authAction=null;return;}
      if(G.authAction&&authData.session)return;
      if(!authData.session){G.authAction=null;return;}
      try{await api();}catch(error){if(!user){G.authLinkError=error.message;return;}throw error;}
    },
    read(){G.utils.assert(data&&user,'Inicia sesión para continuar.');return structuredClone(data);},
    transaction(){throw new Error('Los cambios se guardan en Supabase, no en el navegador.');}
  };
  G.auth.current=()=>user;
  G.auth.data=()=>G.repo.read();
  G.auth.employees=()=>user?G.repo.read().employees.filter(e=>!e.deletedAt):[];
  G.auth.login=async(identifier,password)=>{
    let response;try{response=await fetcher(config.url+'/functions/v1/team-login',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({identifier,password})});}
    catch{throw new Error('No se pudo conectar. Comprueba tu conexión a internet.');}
    const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo iniciar sesión.');
    const {error}=await client.auth.setSession(result);if(error)throw new Error('No se pudo abrir tu sesión. Intenta nuevamente.');
    G.authLinkError=null;G.authAction=null;
    try{return await api();}catch(error){G.clearCloudData();await client.auth.signOut({scope:'local'});throw error;}
  };
  G.auth.logout=async()=>{
    const {error}=await client.auth.signOut({scope:'local'});G.authAction=null;G.clearCloudData();
    if(error)throw new Error('No se pudo revocar la sesión en el servidor. Reintenta cuando tengas conexión.');
  };
  for(const [service,methods] of Object.entries({records:['saveEmployee','toggleEmployee','deleteEmployee','addMovement','voidRecord','saveEvent','saveUser','toggleUser','deleteUser','saveCompany','saveCatalog','toggleCatalog','deleteCatalog'],payroll:['addPayment','prepare']}))
    for(const method of methods)G[service][method]=(...args)=>command(`${service}.${method}`,args);
  G.sendCloudInvite=id=>command('accounts.invite',[id]);
  G.refresh=()=>api();
}
