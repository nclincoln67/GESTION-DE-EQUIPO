'use strict';
// Lectura exclusiva de configuraciones. La salida es privada: no guardarla en GitHub.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { emptyData } = require('../server/domain.cjs');
const state = emptyData();
const filename = path.join(__dirname, '..', 'storage', 'inkajus.sqlite');
let counts = [];
if (fs.existsSync(filename)) {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const row = db.prepare("select value from metadata where key='settings'").get();
    if (row) state.settings = JSON.parse(row.value);
    counts = db.prepare('select kind,count(*) as count from records group by kind').all();
  } finally { db.close(); }
}
console.log(JSON.stringify({ state, localCounts: counts }));
