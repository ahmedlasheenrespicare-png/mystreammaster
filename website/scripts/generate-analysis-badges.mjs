// Rasterize the reviewed club SVG assets to local transparent WebP files.
// Sources, pinned revision and distribution notice: src/assets/club-logos/.
// Browser-side requests never contact a third-party logo host.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {chromium} from '@playwright/test';
import chromiumBinary, {inflate} from '@sparticuz/chromium';
const website=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(website,'src/assets/club-logos');
const manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
const libraries=await inflate(path.join(website,'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'club-logos-'));
const browser=await chromium.launch({executablePath:await chromiumBinary.executablePath(),args:chromiumBinary.args,env:{...process.env,LD_LIBRARY_PATH:`${libraries}/lib:${process.env.LD_LIBRARY_PATH||''}`}});
try {
 const page=await browser.newPage({viewport:{width:280,height:280},deviceScaleFactor:1});
 await page.route('**/*',r=>r.abort());
 for(const {slug} of manifest.logos){
  if(!/^[a-z]+(?:-[a-z]+)*$/.test(slug))throw new Error('Invalid club asset identity');
  const svg=await fs.readFile(path.join(source,`${slug}.svg`),'utf8');
  if(/<script|<foreignObject|\son\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(svg))throw new Error('Club SVG must be self-contained and passive');
  await page.setContent(`<html><head><style>html,body{margin:0;width:280px;height:280px;background:transparent}body>svg{display:block;width:100%;height:100%}</style></head><body>${svg}</body></html>`);
  const png=path.join(temp,`${slug}.png`);
  await page.screenshot({path:png,omitBackground:true});
  const destination=path.join(website,'public/images/teams',`${slug}-club-badge.webp`);
  execFileSync('convert',[png,'-quality','92',destination]);
  console.log(destination);
 }
} finally {await browser.close();await fs.rm(temp,{recursive:true,force:true});}
