/* Verificación sin instalaciones ni dependencias. Ejecutar desde cualquier carpeta. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  });
}

try {
  const scripts = ['assets/js','server','scripts'].flatMap(directory => files(path.join(root, directory))).filter(file => /\.c?js$/.test(file));
  for (const file of scripts) {
    new vm.Script(fs.readFileSync(file, 'utf8'), { filename: path.relative(root, file) });
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g)) {
    if (!fs.existsSync(path.join(root, match[1]))) throw new Error(`Falta el recurso ${match[1]}`);
  }
  console.log(`Sintaxis y recursos locales correctos: ${scripts.length} archivos JavaScript.`);
  for (const suite of ['smoke.cjs', 'server.cjs']) {
  const result = spawnSync(process.execPath, [path.join(root, 'tests', suite)], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
  if (process.exitCode) break;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
