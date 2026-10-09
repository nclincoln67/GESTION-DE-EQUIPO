'use strict';

// Se ejecutan las MISMAS reglas verificadas del prototipo, con persistencia y permisos de servidor.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const sources = ['core/utils.js', 'data/demo-data.js', 'services/payroll.js', 'services/records.js']
  .map(file => new vm.Script(fs.readFileSync(path.join(root, 'assets/js', file), 'utf8'), { filename: file }));

function safeUser(user) {
  if (!user) return null;
  const { password, passwordHash, passwordSalt, ...safe } = user;
  return safe;
}

function domain(data, userId) {
  let memory = structuredClone(data);
  const context = vm.createContext({ Intl, Date, Math, crypto: crypto.webcrypto, structuredClone });
  context.window = context;
  for (const script of sources) script.runInContext(context);
  const G = context.GE;
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
}

function emptyData() {
  const { G } = domain({ users: [], employees: [] }, null);
  const data = G.createDemo();
  for (const kind of ['employees', 'users', 'movements', 'payments', 'periods', 'events', 'audit']) data[kind] = [];
  return structuredClone(data);
}

module.exports = { domain, emptyData, safeUser };
