'use strict';

// Se ejecutan las MISMAS reglas verificadas del prototipo, con persistencia y permisos de servidor.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const sources = ['core/utils.js', 'data/demo-data.js', 'services/payroll.js', 'services/records.js', 'services/domain-runtime.js']
  .map(file => new vm.Script(fs.readFileSync(path.join(root, 'assets/js', file), 'utf8'), { filename: file }));

function safeUser(user) {
  if (!user) return null;
  const { password, passwordHash, passwordSalt, ...safe } = user;
  return safe;
}

function domain(data, userId) {
  const context = vm.createContext({ Intl, Date, Math, crypto: crypto.webcrypto, structuredClone });
  context.window = context;
  for (const script of sources) script.runInContext(context);
  const G = context.GE;
  return G.createRuntime(data, userId);
}

function emptyData() {
  const { G } = domain({ users: [], employees: [] }, null);
  const data = G.createDemo();
  for (const kind of ['employees', 'users', 'movements', 'payments', 'periods', 'events', 'audit']) data[kind] = [];
  return structuredClone(data);
}

module.exports = { domain, emptyData, safeUser };
