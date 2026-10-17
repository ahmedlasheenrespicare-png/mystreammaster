import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {load} from 'cheerio';
import {validateCityParis,renderCityParisReport} from './render-city-paris.mjs';
import {cityParisEvent,cityParisStandings} from '../public/_assets/city-paris-data.js';
const report=JSON.parse(await fs.readFile(new URL('../src/content/city-paris-report.json',import.meta.url),'utf8'));
test('complete independent report snapshot; correct match and provider separation',()=>{
  assert.equal(validateCityParis(report).matchId,'2049580');
  const $=load('<main data-city-paris-report><div data-city-report-sections></div></main>');
  renderCityParisReport($,report);
  assert.equal($('[data-stat]').length,24);assert.equal($('[data-player-rating]').length,29);
  assert.equal($('tbody tr').length,107); // 24 statistics + 9 subs + 74 standings
  assert.equal($('.fc-card').length,9);
  assert.ok($('#source-fotmob').text().includes('63'));
  assert.equal($('[data-starting-player="737066"] [data-player-rating]').attr('data-player-rating'),'9.1');
  assert.equal($('iframe,video').length,0);
});
const fixture=()=>({id:'401915407',date:'2026-10-14T19:00:00Z',status:{type:{completed:true}},competitions:[{competitors:[{homeAway:'home',team:{id:'382'},score:'2'},{homeAway:'away',team:{id:'160'},score:'4'}]}]});
test('scoreboard binds verified ESPN ID, teams, kickoff and final status',()=>{
  assert.deepEqual(cityParisEvent([fixture()]).score,{home:2,away:4});
  for(const change of [e=>e.id='1',e=>e.date='2026-10-15T19:00:00Z',e=>e.status.type.completed=false,e=>e.competitions[0].competitors[0].team.id='360',e=>e.competitions[0].competitors[0].score=null]){
    const e=fixture();change(e);assert.throws(()=>cityParisEvent([e]));
  }
  assert.throws(()=>cityParisEvent([fixture(),fixture()]));
});
test('three full standings tables validate; missing/zero and signed differences are preserved',()=>{
  for(const table of report.standings){
    const data={...table,ok:true,provider:'ESPN',phase:'league',stale:false,fetchedAt:'2026-10-16T12:00:00Z'};
    assert.equal(cityParisStandings(data,table.league).length,table.entries.length);
    assert.throws(()=>cityParisStandings({...data,entries:data.entries.slice(1)},table.league));
    const bad=structuredClone(data);bad.entries[1].rank=bad.entries[0].rank;assert.throws(()=>cityParisStandings(bad,table.league));
  }
});
test('French table is a complete dated snapshot and stays un-wired from the live standings service',async()=>{
  /* كان الفحص يمنع 'fra.1' في قائمة الوسيط؛ وبعد توسيع قائمة الوسيط المعتمد
     صار الحرص على الحدّ نفسه في موضعه الصحيح: بطاقة التقرير تبقى لقطة مجمّدة
     غير موصولة بخطّاف التحديث الحيّ (data-standing-league)، ويؤكد الباقي ثبات
     الحالة والنص وعدد الصفوف. القائمة المسموحة في الوسيط تخصّ صفحات البطولات
     وحدها، فلا تُسحب بياناتها الحيّة إلى تقارير المواجهات المراجَعة. */
  const $=load('<main data-city-paris-report><div data-city-report-sections></div></main>');
  renderCityParisReport($,report);
  const card=$('[data-city-standing="fra.1"]');
  assert.equal(card.attr('data-standing-league'),undefined);
  assert.equal(card.attr('data-feed-state'),'snapshot');
  assert.equal(card.find('tbody tr').length,18);
  assert.match(card.find('[data-city-standing-status]').text(),/لقطة ثابتة مؤرخة/);
});
test('Arabic reviews use verified fixture-specific videos and centralized references',()=>{
  const $=load('<main data-city-paris-report><div data-city-report-sections></div></main>');
  renderCityParisReport($,report);
  assert.equal($('#arabic-reviews .fr-card').length,2);
  for(const [id,videoId,scope,date] of [['awaad','whtGr0wtW3U','roundup','2026-10-14'],['nasrallah','RVkq5UDzrvQ','match','2026-10-15']]){
    const card=$(`[data-analyst-review="${videoId}"]`);
    assert.equal(card.attr('data-review-scope'),scope);
    assert.equal(card.find('.fr-open-video').attr('href'),`#source-${id}-review`);
    const source=$(`#source-${id}-review`);
    assert.equal(source.find('a').attr('href'),`https://www.youtube.com/watch?v=${videoId}`);
    assert.equal(source.find('a').attr('rel'),'noopener noreferrer');
    assert.ok(source.text().includes(date));
    assert.equal($(`#${card.attr('aria-labelledby')}`).length,1);
  }
  assert.equal($('#arabic-reviews a[href^="https://"],iframe,video').length,0);
  assert.doesNotMatch($('#arabic-reviews').text(),/لم نعثر|بانتظار مصدر/);
  for(const change of [d=>d.reviews[0].matchId='2025',d=>d.reviews[0].publishedOn='2025-01-22',d=>d.reviews[0].videoId='bad',d=>d.sources=d.sources.filter(s=>s[0]!=='awaad-review')]){
    const bad=structuredClone(report);change(bad);assert.throws(()=>validateCityParis(bad),/Invalid analyst review source/);
  }
});
