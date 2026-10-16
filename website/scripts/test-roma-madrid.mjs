import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {load} from 'cheerio';
import {renderRomaMadridReport,validateRomaMadrid} from './render-roma-madrid.mjs';
import {romaMadridEvent,romaMadridStandings} from '../public/_assets/roma-madrid-data.js';
const report=JSON.parse(await fs.readFile(new URL('../src/content/roma-madrid-report.json',import.meta.url),'utf8'));
const render=()=>{
 const $=load('<main data-roma-madrid-report><div data-roma-report-sections></div></main>');
 renderRomaMadridReport($,report);return $;
};
test('Roma–Madrid independent snapshot has the full report and correct player award separation',()=>{
 const $=render();
 assert.equal(validateRomaMadrid(report).matchId,'2049581');
 assert.equal($('[data-starting-player]').length,22);
 assert.equal($('[data-substitute-player]').length,10);
 assert.equal($('[data-player-rating]').length,32);
 assert.equal($('.fl-unused li').length,13);
 assert.equal($('#uefa-stats tbody tr').length,24);
 assert.equal($('.fc-card').length,9);
 assert.equal($('.fh-card').length,3);
 assert.equal($('.preview-card').length,4);
 assert.equal($('#competition-standings tbody tr').length,76);
 assert.equal($('.report-source').length,15);
 assert.equal($('#source-uefa-match a').attr('href'),'https://www.uefa.com/uefachampionsleague/match/2049581--roma-vs-real-madrid/');
 assert.equal($('[data-starting-player="660301"] [data-player-rating]').attr('data-player-rating'),'8.7');
 assert.match($('.fl-recognition').text(),/إندريك/);
 assert.match($('#source-fotmob').text(),/82′/);
 assert.equal($('.fl-captain').length,2);
 assert.equal($('iframe,video,script').length,0);
 const ids=$('[id]').map((_,e)=>$(e).attr('id')).get();assert.equal(new Set(ids).size,ids.length);
 assert.ok($('#analysis-charts').text().includes('روما'));
 assert.ok($('#analysis-charts').text().includes('ريال مدريد'));
 assert.doesNotMatch($('#analysis-charts').text(),/سيتي|باريس|أتلتيكو|يونايتد/);
});
test('Roma report centralizes every external reference and binds the two reviewed videos',()=>{
 const $=render();
 for(const a of $('a[href^="https://"]').toArray()) assert.equal($(a).closest('#report-sources').length,1);
 for(const a of $('a[href^="#"]').toArray()) assert.equal($($(a).attr('href')).length,1);
 for(const [name,id,scope] of [['awaad','whtGr0wtW3U','roundup'],['nasrallah','TP5-CX67cgg','match']]){
  assert.equal($(`[data-analyst-review="${id}"]`).attr('data-review-scope'),scope);
  assert.equal($(`#source-${name}-review a`).attr('href'),`https://www.youtube.com/watch?v=${id}`);
 }
 for(const change of [d=>d.matchId='2049580',d=>d.espnEventId='401915407',d=>d.reviews[0].matchId='2049580',d=>d.reviews[0].publishedOn='2025-01-22',d=>d.sources=d.sources.filter(s=>s[0]!=='awaad-review'),d=>d.standings[1].league='fra.1']){
  const bad=structuredClone(report);change(bad);assert.throws(()=>validateRomaMadrid(bad));
 }
});
const event=()=>({id:'401915414',date:'2026-10-14T19:00:00Z',status:{type:{completed:true}},competitions:[{competitors:[{homeAway:'home',team:{id:'104'},score:'3'},{homeAway:'away',team:{id:'86'},score:'4'}]}]});
test('Roma live feed rejects another fixture, invalid scores, kickoff or unfinished games',()=>{
 assert.deepEqual(romaMadridEvent([event()]).score,{home:3,away:4});
 for(const change of [e=>e.id='401915407',e=>e.date='2026-10-14T16:45:00Z',e=>e.status.type.completed=false,e=>e.competitions[0].competitors[0].team.id='86',e=>e.competitions[0].competitors[0].score=null]){
  const bad=event();change(bad);assert.throws(()=>romaMadridEvent([bad]));
 }
 assert.throws(()=>romaMadridEvent([event(),event()]));
});
test('Italian and Spanish full standings retain ranks, real zeros and missing values',()=>{
 for(const t of report.standings){
  const body={...t,ok:true,provider:'ESPN',phase:'league',stale:false,fetchedAt:'2026-10-16T12:00:00Z'};
  assert.equal(romaMadridStandings(body,t.league).length,t.entries.length);
  assert.throws(()=>romaMadridStandings({...body,season:2025},t.league));
  assert.throws(()=>romaMadridStandings({...body,entries:body.entries.slice(1)},t.league));
  const bad=structuredClone(body);bad.entries[1].rank=bad.entries[0].rank;assert.throws(()=>romaMadridStandings(bad,t.league));
  const missing=structuredClone(body);missing.entries[0].points=null;missing.entries[1].points=0;
  const result=romaMadridStandings(missing,t.league);assert.equal(result[0].points,null);assert.equal(result[1].points,0);
 }
 assert.equal(report.standings[1].entries.find(e=>e.teamId==='104').rank,3);
 assert.equal(report.standings[2].entries.find(e=>e.teamId==='86').rank,4);
});
test('Italian snapshot stays outside PHP scope; templates and sitemap use the new route',async()=>{
 const php=await fs.readFile(new URL('../public/standings.php',import.meta.url),'utf8');
 assert.doesNotMatch(php,/'ita\.1'\s*=>/);
 const card=render()('[data-roma-standing="ita.1"]');
 assert.equal(card.attr('data-feed-state'),'snapshot');
 assert.equal(card.find('tbody tr').length,20);
 assert.match(card.find('[data-roma-standing-status]').text(),/لقطة ثابتة مؤرخة/);
 for(const suffix of ['','watch/']){
  const $=load(await fs.readFile(new URL(`../legacy/roma-real-madrid/${suffix}index.html`,import.meta.url),'utf8'));
  assert.equal($('h1').length,1);
  assert.equal($('link[rel="canonical"]').attr('href'),`https://streammasterstore.com/roma-real-madrid/${suffix}`);
  assert.doesNotMatch($('main').text(),/مانشستر|باريس|الاتحاد/);
  const graph=JSON.parse($('script[type="application/ld+json"]').text())['@graph'];
  assert.equal(graph[0].dateModified,'2026-10-16');
  for(const q of graph.find(n=>n['@type']==='FAQPage')?.mainEntity || []){
   assert.ok($('details').toArray().some(e=>$(e).find('summary').text()===q.name && $(e).find('p').text()===q.acceptedAnswer.text));
  }
 }
 const xml=await fs.readFile(new URL('../public/sitemap-0.xml',import.meta.url),'utf8');
 assert.match(xml,/https:\/\/streammasterstore.com\/roma-real-madrid\//);
});
