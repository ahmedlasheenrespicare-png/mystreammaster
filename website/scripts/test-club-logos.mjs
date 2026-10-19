import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
const website=new URL('../',import.meta.url);
const manifest=JSON.parse(await fs.readFile(new URL('src/assets/club-logos/manifest.json',website),'utf8'));
const clubs=['as-roma','real-madrid','manchester-city','paris-saint-germain','atletico-madrid','manchester-united','galatasaray','barcelona','as-monaco','sc-freiburg','internazionale','al-qadsiah','pyramids-fc'];
test('all thirteen club crests have pinned source files and retained distribution notices',async()=>{
 assert.deepEqual(manifest.logos.map(l=>l.slug),clubs);
 assert.match(manifest.revision,/^[a-f0-9]{40}$/);assert.equal(manifest.license,'MIT');
 const license=await fs.readFile(new URL('src/assets/club-logos/LICENSE.txt',website),'utf8');
 const notice=await fs.readFile(new URL('public/_assets/club-logos-notices.txt',website),'utf8');
 assert.match(license,/Copyright \(c\) 2026 Jose Arroyave/);assert.ok(notice.includes(license));
 for(const logo of manifest.logos){
  assert.ok(logo.source.includes(`/blob/${manifest.revision}/logos/`));assert.ok(notice.includes(logo.source));
  const svg=await fs.readFile(new URL(`src/assets/club-logos/${logo.slug}.svg`,website));
  assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${svg.length}\0`),svg])).digest('hex'),logo.sha);
  const $=load(svg.toString(),{xmlMode:true});assert.ok($('svg path').length>0,'actual vector crest, not a letter-only monogram');
  assert.doesNotMatch(svg.toString(),/<script|<foreignObject|\son\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i);
  const webp=await fs.readFile(new URL(`public/images/teams/${logo.slug}-club-badge.webp`,website));
  assert.equal(webp.subarray(0,4).toString(),'RIFF');assert.equal(webp.subarray(8,12).toString(),'WEBP');
  /* الشعارات الهندسية البسيطة (درع القادسية) تُضغط إلى نحو 3 كيلوبايت؛ الحد
     يحمي من ملف فارغ أو مبتور، لا من تفاوت تعقيد الشعارات. */
  assert.ok(webp.length>1000,`${logo.slug}: ملف WebP صغير بشكل غير معقول`);
 }
});
test('the season cards and every match report use local club crests with descriptive alternative text',async()=>{
 let count=0;
 for(const slug of ['match-analysis','roma-real-madrid','manchester-city-psg','manchester-united-atletico','galatasaray-barcelona']){
  const $=load(await fs.readFile(new URL(`../${slug}/index.html`,website),'utf8'));
  const images=$('main img');assert.equal(images.length,slug==='match-analysis'?8:2);
  for(const img of images.toArray()){
   const src=$(img).attr('src');assert.match(src,/^\/images\/teams\/[a-z-]+-club-badge\.webp$/);
   assert.match($(img).attr('alt'),/^شعار .+/);assert.ok(Number($(img).attr('width'))>0&&Number($(img).attr('height'))>0);
   await fs.access(new URL('public'+src,website));count++;
  }
  assert.equal($('main .ma-banner,main .ma-photo-credit').length,0);
  assert.doesNotMatch($('main').text(),/الرموز.*تصميم طباعي أصلي|ليست الشعارات الرسمية|ليست شعاراتها الرسمية/);
 }
 assert.equal(count,16);
});
