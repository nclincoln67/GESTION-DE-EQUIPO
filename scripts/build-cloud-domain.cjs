'use strict';
// Artefacto mecánico: nunca editar generated/domain.mjs a mano.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['core/utils.js', 'services/payroll.js', 'services/records.js', 'services/domain-runtime.js'];
const sources = files.map(file => fs.readFileSync(path.join(root, 'assets/js', file), 'utf8')).join('\n');
const commands = fs.readFileSync(path.join(root, 'server/commands.cjs'), 'utf8').replace('module.exports = { cleanCommand };', 'export { cleanCommand };');
const bundle = `// Generado a partir de las reglas locales verificadas.\nexport function domain(data, userId) {\nconst window = {};\n${sources}\nconst G = window.GE;\nG.utils.today = () => { const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()); const value = k => parts.find(p=>p.type===k).value; return value('year')+'-'+value('month')+'-'+value('day'); };\nreturn G.createRuntime(data, userId);\n}\n${commands}\n`;
const target = path.join(root, 'supabase/functions/team-api/generated');
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, 'domain.mjs'), bundle);
console.log('Reglas de Supabase generadas desde las mismas fuentes locales.');
