'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Store } = require('../server/store.cjs');
const root = path.resolve(__dirname, '..');
async function main() {
  const source = process.env.DATABASE_PATH || path.join(root, 'storage', 'inkajus.sqlite');
  if (!fs.existsSync(source)) throw new Error('Primero inicia INKAJUS para crear la base de datos.');
  const directory = process.env.BACKUP_DIR || path.join(root, 'backups');
  fs.mkdirSync(directory, { recursive: true });
  const name = `inkajus-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}.sqlite`;
  const target = path.join(directory, name);
  const store = new Store(source);
  try { await store.backup(target); } finally { store.close(); }
  console.log(`Copia completa creada: ${target}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
