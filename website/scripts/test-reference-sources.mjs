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
    for(const name of ['path-fan.js','path-fan.css','heading-accents.js','heading-accents.css','simple-steps/steps.js','simple-steps/steps.css'])assert.ok(html.includes(`${name}?v=${first}`));
    assert.ok(html.includes(`rose-strip.js?v=${first}`));
    assert.ok(html.includes(`video-streammaster-hero-montage-1080.mp4?v=${first}`));
    const stats=await fs.readFile(path.join(dir,'assets/sports-stats.js'),'utf8');
    assert.ok(stats.includes(`standings.js?v=${first}`));
    assert.ok(stats.includes(`standings-snapshot.json?v=${first}`));
    const matches=await fs.readFile(path.join(dir,'assets/matches.js'),'utf8');
    assert.ok(matches.includes(`scoreboard-incidents.js?v=${first}`));
    let current=first;
    for(const name of ['path-fan.js','path-fan.css','heading-accents.js','heading-accents.css','simple-steps/steps.js','simple-steps/steps.css','simple-steps/icons/trial.svg','simple-steps/icons/server.svg','simple-steps/icons/setup.svg','simple-steps/icons/watch.svg']) {
      await fs.appendFile(path.join(dir,'assets',name),'\n');
      const changed=await versionReferenceAssets(dir);
      assert.notEqual(changed,current,`${name} invalidates the reference cache`);
      current=changed;
    }
    await fs.appendFile(path.join(dir,'assets/standings.js'),'\n// changed\n');
    const next=await versionReferenceAssets(dir);
    assert.notEqual(next,first);
    html=await fs.readFile(path.join(dir,'index.html'),'utf8');
    assert.ok(html.includes(`sports-stats.js?v=${next}`));
    assert.ok(!html.includes(`sports-stats.js?v=${first}`));
    assert.ok(html.includes(`path-sport.jpg?v=${next}`));
    await fs.appendFile(path.join(dir,'assets/path-sport.jpg'),Buffer.from([0]));
    const imageHash=await versionReferenceAssets(dir);
    assert.notEqual(imageHash,next,'image changes invalidate the reference cache');
    await fs.appendFile(path.join(dir,'assets/hero-video-mobile.mp4'),Buffer.from([0]));
    assert.notEqual(await versionReferenceAssets(dir),imageHash,'mobile video changes invalidate the reference cache');
  } finally { await fs.rm(dir,{recursive:true,force:true}) }
});

test('reference path prices and specifications track canonical homepage plans', async () => {
  const {loadHomepagePlans,applyReferencePlanFields}=await import('./sync-reference-paths.mjs');
  const plans=await loadHomepagePlans(website);
  const html=await fs.readFile(path.join(website,'../home-preview/saved-reference/index.html'),'utf8');
  assert.equal(applyReferencePlanFields(html,plans),html,'committed preview matches homepage values');
  const changed=structuredClone(plans);changed.find(p=>p.serverCode==='nova').prices['12'].USD=99;
  const updated=applyReferencePlanFields(html,changed);
  assert.match(updated,/data-path-field="nova\.price">\$99/);
  assert.equal((updated.match(/data-path-field="nova\.price">\$99/g)||[]).length,1);
  const clean=value=>value.replace(/[\u2066-\u2069]/g,'');
  assert.match(clean(html),/data-path-shared-channels>أكثر من 14,000 قناة حية<\/dd>/);
  assert.match(clean(html),/data-path-shared-quality>حتى 4K حسب الباقة<\/dd>/);
  assert.match(clean(html),/data-path-shared-vod>أكثر من 50,000 فيلم ومسلسل<\/dd>/);
  changed.find(p=>p.serverCode==='istar').vodCount='+60,000 فيلم ومسلسل';
  assert.match(clean(applyReferencePlanFields(html,changed)),/data-path-shared-vod>أكثر من 50,000 فيلم ومسلسل<\/dd>/);
  const same=structuredClone(plans);for(const code of ['nova','istar','x'])same.find(p=>p.serverCode===code).vodCount='+70,000 فيلم ومسلسل';
  assert.match(clean(applyReferencePlanFields(html,same)),/data-path-shared-vod>أكثر من 70,000 فيلم ومسلسل<\/dd>/);
  changed.find(p=>p.serverCode==='nova').channelsCount='+9,000 قناة حية';
  assert.match(clean(applyReferencePlanFields(html,changed)),/data-path-shared-channels>أكثر من 9,000 قناة حية<\/dd>/);
  for(const code of ['nova','istar','x'])changed.find(p=>p.serverCode===code).quality='HD';
  assert.match(clean(applyReferencePlanFields(html,changed)),/data-path-shared-quality>حتى HD حسب الباقة<\/dd>/);
  changed.find(p=>p.serverCode==='x').channelsCount='غير محدد';
  assert.match(clean(applyReferencePlanFields(html,changed)),/data-path-shared-channels>تختلف حسب الباقة<\/dd>/);
});

test('reference server cards track annual homepage pricing and specifications', async () => {
  const {loadHomepagePlans,applyReferenceServerFields}=await import('./sync-reference-paths.mjs');
  const plans=await loadHomepagePlans(website);
  const html=await fs.readFile(path.join(website,'../home-preview/saved-reference/index.html'),'utf8');
  assert.equal(applyReferenceServerFields(html,plans),html);
  const section=html.match(/<section[^>]*id="works"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section);
  assert.doesNotMatch(section,/المزود/);
  assert.equal((section.match(/القنوات المعلنة/g)||[]).length,4);
  assert.equal((section.match(/تشمل المواصفات المعلنة لهذا السيرفر/g)||[]).length,4);
  const changed=structuredClone(plans),moka=changed.find(p=>p.serverCode==='moka');
  moka.prices['12'].USD=99;moka.channelsCount='+99,000 قناة حية';moka.description='وصف جديد من الرئيسية';
  const updated=applyReferenceServerFields(html,changed);
  assert.match(updated,/data-server-field="moka\.price">\$99/);
  assert.match(updated,/data-server-field="moka\.channels"><span class="sm-server__count" aria-hidden="true">\+99,000/);
  assert.match(updated,/data-server-field="moka\.description">وصف جديد من الرئيسية/);
});

test('league world is self-contained in the approved reference and versioned', async () => {
  const reference=path.resolve(website,'../home-preview/saved-reference');
  const html=await fs.readFile(path.join(reference,'index.html'),'utf8');
  const entry=await fs.readFile(path.join(reference,'assets/league-world-entry.js'),'utf8');
  const world=await fs.readFile(path.join(reference,'assets/league-world/world.html'),'utf8');
  assert.match(html,/class="world-launch"/);
  assert.match(html,/assets\/league-world-entry\.js/);
  assert.match(entry,/saved-reference\/assets\/league-world\/world\.html/);
  assert.doesNotMatch(world,/league-world-preview\/kota/);
  assert.match(world,/name="robots" content="noindex, nofollow"/);
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sm-league-world-version-'));
  try{
    await fs.cp(reference,dir,{recursive:true});
    const {versionReferenceAssets}=await import('./version-reference-assets.mjs');
    const first=await versionReferenceAssets(dir);
    const generated=await fs.readFile(path.join(dir,'assets/league-world/world.html'),'utf8');
    assert.ok(generated.includes(`world-motion.js?v=${first}`));
    assert.ok(generated.includes(`motion-settings.js?v=${first}`));
    assert.ok(generated.includes(`league-panels.css?v=${first}`));
    assert.ok((await fs.readFile(path.join(dir,'assets/league-world/league-overlay.js'),'utf8')).includes(`league-panels.js?v=${first}`));
    assert.ok((await fs.readFile(path.join(dir,'assets/league-world-entry.js'),'utf8')).includes(`world.html?v=${first}`));
    await fs.appendFile(path.join(dir,'assets/league-world/world-motion.js'),'\n// test change\n');
    assert.notEqual(await versionReferenceAssets(dir),first);
  }finally{await fs.rm(dir,{recursive:true,force:true})}
});
