'use strict';
const fs=require('node:fs'),path=require('node:path'),{buildSync}=require('esbuild');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
// Nunca copiar la raíz ni una carpeta arbitraria: inventario cerrado desde el HTML.
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace(/  <script src="assets\/js\/data\/(?:demo-data|server-adapter)\.js"><\/script>\r?\n/g,'');
html=html.replace('  <script src="assets/js/app.js"></script>',
  '  <script src="assets/js/cloud-config.js"></script>\n  <script src="assets/js/cloud-adapter.js"></script>\n  <script src="assets/js/app.js"></script>');
const resources=[...html.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g)].map(m=>m[1]);
const generated=new Set(['assets/js/cloud-config.js','assets/js/cloud-adapter.js']);
const planned=['index.html','_headers',...resources,'assets/js/cloud-adapter.js.LEGAL.txt'];
// Comprobar el contenido de dist existente; no sobrescribir archivos ajenos a esta salida.
function inventory(dir){return fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?inventory(path.join(dir,e.name)):[path.relative(out,path.join(dir,e.name)).replaceAll('\\','/')]):[];}
for(const file of inventory(out))if(!planned.includes(file))throw new Error('Archivo inesperado en dist: '+file);
fs.mkdirSync(out,{recursive:true});
for(const file of resources){if(generated.has(file))continue;
  const target=path.join(out,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
// Los iconos son recursos de interfaz, no documentos operativos.
fs.writeFileSync(path.join(out,'index.html'),html);
const config=JSON.parse(fs.readFileSync(path.join(root,'frontend/public-config.json'),'utf8'));
if(config.url!=='https://tvzkgolvgfwyjomqihgb.supabase.co'||!config.publishableKey?.startsWith('sb_publishable_'))throw new Error('Configuración pública inválida.');
fs.writeFileSync(path.join(out,'assets/js/cloud-config.js'),'window.GE.cloudConfig='+JSON.stringify(config)+';\n');
buildSync({entryPoints:[path.join(root,'frontend/cloud-adapter.mjs')],outfile:path.join(out,'assets/js/cloud-adapter.js'),bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'external'});
fs.writeFileSync(path.join(out,'_headers'),`/*\n  Cache-Control: no-store\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n  X-Robots-Tag: noindex, nofollow\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ${config.url}; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'\n`);
console.log('Frontend compilado en dist: solo recursos de interfaz, sin servidor, base local ni demostración.');
