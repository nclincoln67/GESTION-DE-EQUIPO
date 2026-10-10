(function (G) {
  'use strict';
  // Compartido por Node y Supabase. Cada petición recibe su propio G y memoria.
  G.createRuntime = function (data, userId) {
    let memory = structuredClone(data);
    const safeUser = user => {
      if (!user) return null;
      const { password, passwordHash, passwordSalt, ...safe } = user;
      return safe;
    };
    G.repo = {
      read: () => structuredClone(memory),
      transaction(update) { const draft = structuredClone(memory); const result = update(draft); memory = draft; return result; },
    };
    G.auth = {
      current: () => safeUser(memory.users.find(u => u.id === userId && u.active && !u.deletedAt && (u.role === 'admin' || memory.employees.some(e => e.id === u.employeeId && !e.deletedAt)))),
      isAdmin() { return this.current()?.role === 'admin'; },
      requireAdmin() { G.utils.assert(this.isAdmin(), 'Esta acción requiere una cuenta de administrador.'); },
      requireEmployee(id) { G.utils.assert(this.isAdmin() || this.current()?.employeeId === id, 'No tienes acceso a este perfil.'); },
      employees() { return this.data().employees.filter(e => !e.deletedAt); },
      data() {
        const user = this.current();
        G.utils.assert(user, 'Inicia sesión para continuar.');
        const result = structuredClone(memory);
        result.users = result.users.map(safeUser);
        if (user.role !== 'admin') {
          result.employees = result.employees.filter(e => e.id === user.employeeId);
          for (const kind of ['movements', 'payments', 'events', 'periods']) result[kind] = result[kind].filter(r => r.employeeId === user.employeeId);
          result.users = []; result.audit = [];
        }
        return result;
      },
    };
    return { G, data: () => structuredClone(memory) };
  };
})(window.GE);
