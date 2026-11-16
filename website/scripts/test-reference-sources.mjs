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
