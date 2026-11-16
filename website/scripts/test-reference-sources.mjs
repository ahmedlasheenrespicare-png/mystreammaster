import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncReferenceSources } from './sync-reference-sources.mjs';
const website=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('reference preview publishes the homepage snapshot and parsers from the canonical sources',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sm-reference-sources-'));
  try{
    await syncReferenceSources(website,dir);
    for(const name of ['matches','scoreboard-incidents','standings','fixtures-archive','leader-logo']){
      const source=await fs.readFile(path.join(website,'src/lib',`${name}.mjs`),'utf8');
      assert.equal(await fs.readFile(path.join(dir,`${name}.js`),'utf8'),source.replaceAll('./scoreboard-incidents.mjs','./scoreboard-incidents.js'));
    }
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir,'standings-snapshot.json'),'utf8')),JSON.parse(await fs.readFile(path.join(website,'src/content/standings-snapshot.json'),'utf8')));
  }finally{await fs.rm(dir,{recursive:true,force:true})}
});

test('reference asset versions change when dependencies change and are stable across builds',async()=>{
  const {versionReferenceAssets}=await import('./version-reference-assets.mjs');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sm-reference-version-'));
  const reference=path.resolve(website,'../home-preview/saved-reference');
  try {
    await fs.cp(reference,dir,{recursive:true});
    const first=await versionReferenceAssets(dir);
    assert.equal(await versionReferenceAssets(dir),first,'identical builds keep the same version');
    let html=await fs.readFile(path.join(dir,'index.html'),'utf8');
    assert.ok(html.includes(`sports-stats.js?v=${first}`));
    assert.ok(html.includes(`featured-matches.js?v=${first}`));
    assert.ok(html.includes(`mobile-motion.js?v=${first}`));
    const stats=await fs.readFile(path.join(dir,'assets/sports-stats.js'),'utf8');
    assert.ok(stats.includes(`standings.js?v=${first}`));
    assert.ok(stats.includes(`standings-snapshot.json?v=${first}`));
    const matches=await fs.readFile(path.join(dir,'assets/matches.js'),'utf8');
    assert.ok(matches.includes(`scoreboard-incidents.js?v=${first}`));
    await fs.appendFile(path.join(dir,'assets/standings.js'),'\n// changed\n');
    const next=await versionReferenceAssets(dir);
    assert.notEqual(next,first);
    html=await fs.readFile(path.join(dir,'index.html'),'utf8');
    assert.ok(html.includes(`sports-stats.js?v=${next}`));
    assert.ok(!html.includes(`sports-stats.js?v=${first}`));
  } finally { await fs.rm(dir,{recursive:true,force:true}) }
});
