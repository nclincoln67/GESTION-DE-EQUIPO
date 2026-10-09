(function (G) {
  'use strict';
  let session = null;
  // Control funcional del prototipo. No representa autorización segura del servidor.
  G.auth = {
    current() { if (!session) return null; const d=G.repo.read(),user=d.users.find(u=>u.id===session && u.active&&!u.deletedAt); if (!user || (user.role==='visitor'&&!d.employees.some(e=>e.id===user.employeeId&&!e.deletedAt))) return null; const {password,...safe}=user; return safe; },
    login(username,password) {
      const u=G.repo.read().users.find(u=>u.active && !u.deletedAt && u.username===username.trim() && u.password===password);
      G.utils.assert(u,'Usuario o contraseña incorrectos.');
      G.utils.assert(u.role==='admin' || G.repo.read().employees.some(e=>e.id===u.employeeId&&!e.deletedAt),'Esta cuenta no tiene un perfil disponible.');
      session=u.id; return this.current();
    },
    logout() { session=null; },
    isAdmin() { return this.current()?.role==='admin'; },
    requireAdmin() { G.utils.assert(this.isAdmin(),'Esta acción requiere una cuenta de administrador.'); },
    requireEmployee(employeeId) { const u=this.current(); G.utils.assert(u && (u.role==='admin'||u.employeeId===employeeId),'No tienes acceso a este perfil.'); },
    employees() { const d=G.repo.read(),u=this.current(); return !u?[]:d.employees.filter(e=>!e.deletedAt&&(u.role==='admin'||e.id===u.employeeId)); },
    data() {
      const d=G.repo.read(),u=this.current(); G.utils.assert(u,'Inicia sesión para continuar.');
      if(u.role==='admin') return d;
      d.employees=d.employees.filter(e=>e.id===u.employeeId);
      ['movements','payments','periods','events'].forEach(key=>d[key]=d[key].filter(x=>x.employeeId===u.employeeId));
      d.users=[]; d.audit=[];
      return d;
    }
  };
})(window.GE);
