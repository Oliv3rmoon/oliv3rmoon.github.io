import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {paths,render} from '../dist-ssr/entry-server.js';
const template=await readFile('dist/index.html','utf8');
const origin='https://oliv3rmoon.github.io';
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
if(!template.includes('<!--app-html-->'))throw Error('Missing prerender template slot');
for(const path of [...paths,'/404']){
 const {html,title}=render(path);
 const routeUrl=origin+(path==='/'?'/':path+'/');
 const output=template.replace('<!--app-html-->',html).replace(/<title>.*?<\/title>/,`<title>${escape(title)}</title>`).replace('<!--route-head-->',path==='/404'?'<meta name="robots" content="noindex"/>':`<link rel="canonical" href="${routeUrl}"/><meta property="og:title" content="${escape(title)}"/><meta property="og:url" content="${routeUrl}"/><meta property="og:type" content="website"/>`);
 const dir='dist'+(path==='/'||path==='/404'?'':path);
 await mkdir(dir,{recursive:true});await writeFile(dir+(path==='/404'?'/404.html':'/index.html'),output);
}
await writeFile('dist/.nojekyll','');
console.log(`Generated ${paths.length} complete pages and a 404 page.`);
