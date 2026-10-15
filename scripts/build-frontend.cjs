'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {buildSync,transformSync}=require('esbuild');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
const config=JSON.parse(fs.readFileSync(path.join(root,'frontend/public-config.json'),'utf8'));
if(config.url!=='https://tvzkgolvgfwyjomqihgb.supabase.co'||!config.publishableKey?.startsWith('sb_publishable_')||
  (config.functionRegion&&config.functionRegion!=='us-west-2'))throw new Error('Configuración pública inválida.');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace(/  <script src="assets\/js\/data\/(?:demo-data|server-adapter)\.js"><\/script>\r?\n/g,'');
const scripts=[...html.matchAll(/<script src="(assets\/[^"?#]+)"><\/script>/g)].map(m=>m[1]);
const styles=[...html.matchAll(/<link rel="stylesheet" href="(assets\/[^"?#]+)">/g)].map(m=>m[1]);
if(scripts.at(-1)!=='assets/js/app.js'||styles.length!==5)throw new Error('Revisar el orden de recursos del frontend.');
// Compilar todo en memoria antes de tocar dist. Nunca copiar la raíz del repositorio.
const cloud=buildSync({entryPoints:[path.join(root,'frontend/cloud-adapter.mjs')],outfile:'cloud-adapter.js',
  write:false,bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'external'});
const source=scripts.slice(0,-1).map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n;\n')+
  '\n;window.GE.cloudConfig='+JSON.stringify(config)+';\n'+cloud.outputFiles.find(f=>f.path.endsWith('/cloud-adapter.js')||f.path.endsWith('\\cloud-adapter.js')).text+
  '\n;'+fs.readFileSync(path.join(root,scripts.at(-1)),'utf8');
const js=transformSync(source,{loader:'js',target:'es2022',minify:true,legalComments:'none'}).code;
const css=transformSync(styles.map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n'),{loader:'css',minify:true}).code;
const hash=value=>crypto.createHash('sha256').update(value).digest('hex').slice(0,16);
const jsPath='assets/build/app-'+hash(js)+'.js',cssPath='assets/build/styles-'+hash(css)+'.css';
html=html.replace(/  <link rel="stylesheet" href="assets\/[^"?#]+">\r?\n/g,'');
html=html.replace('</head>',`  <link rel="preconnect" href="${config.url}" crossorigin>\n  <link rel="stylesheet" href="/${cssPath}">\n</head>`);
html=html.replace(/  <script src="assets\/[^"?#]+"><\/script>\r?\n/g,'');
html=html.replace(/  <!-- Scripts clásicos[^\n]*-->\r?\n/,'');
html=html.replace('</body>',`  <script defer src="/${jsPath}"></script>\n</body>`);
const headers=`/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex, nofollow
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ${config.url}; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
/
  Cache-Control: no-store
/index.html
  Cache-Control: no-store
/404.html
  Cache-Control: no-store
/assets/build/*
  Cache-Control: public, max-age=31536000, immutable
/assets/icons/*
  Cache-Control: public, max-age=3600, must-revalidate
/assets/js/*
  Cache-Control: no-store
/assets/css/*
  Cache-Control: no-store
`;
const output=new Map([
  ['index.html',html],['_headers',headers],[jsPath,js],[cssPath,css],
  [jsPath+'.LEGAL.txt',cloud.outputFiles.find(f=>f.path.endsWith('.LEGAL.txt'))?.text||''],
  ['assets/icons/brand.svg',fs.readFileSync(path.join(root,'assets/icons/brand.svg'))],
  ['404.html',`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>INKAJUS · Página no disponible</title><link rel="stylesheet" href="/${cssPath}"><body><main class="startup"><h1>Esta página no está disponible</h1><p>Utiliza el acceso principal de Gestión de Equipo.</p><a href="/">Volver a INKAJUS</a></main></body></html>`]
]);
// Solo reemplazar archivos generados conocidos. Un archivo ajeno detiene el build.
const legacy=new Set(['index.html','404.html','_headers','assets/js/cloud-config.js','assets/js/cloud-adapter.js','assets/js/cloud-adapter.js.LEGAL.txt','assets/icons/brand.svg',...scripts,...styles]);
function inventory(dir){return fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  if(e.isSymbolicLink())throw new Error('No se permiten enlaces en dist.');
  return e.isDirectory()?inventory(path.join(dir,e.name)):[path.relative(out,path.join(dir,e.name)).replaceAll('\\','/')];
}):[];}
const previous=inventory(out);
for(const file of previous)if(!legacy.has(file)&&!/^assets\/build\/(?:app|styles)-[a-f0-9]{16}\.(?:js(?:\.LEGAL\.txt)?|css)$/.test(file))throw new Error('Archivo inesperado en dist: '+file);
for(const file of previous){const target=path.resolve(out,file);if(!target.startsWith(out+path.sep))throw new Error('Ruta fuera de dist.');fs.unlinkSync(target);}
for(const [file,content] of output){const target=path.join(out,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
console.log(`Frontend: ${output.size} archivos públicos; JS ${Buffer.byteLength(js)} bytes, CSS ${Buffer.byteLength(css)} bytes. Sin servidor, base ni demo.`);
