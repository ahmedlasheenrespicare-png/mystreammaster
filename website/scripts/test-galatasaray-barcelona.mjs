import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {load} from 'cheerio';
import {renderGalatasarayBarcelonaReport,validateGalatasarayBarcelona} from './render-galatasaray-barcelona.mjs';
import {getLegacyAnalysisSeo} from '../dist-ssr/entry-server.js';
const report=JSON.parse(await fs.readFile(new URL('../src/content/galatasaray-barcelona-report.json',import.meta.url),'utf8'));
const render=()=>{const $=load('<main data-galatasaray-barcelona-report><div data-galatasaray-report-sections></div></main>');renderGalatasarayBarcelonaReport($,report);return $;};
test('Galatasaray–Barcelona is complete and independent of the previous fixtures',()=>{
 const $=render();assert.equal(validateGalatasarayBarcelona(report).matchId,'2049576');
 for(const [selector,count] of [['[data-starting-player]',22],['[data-substitute-player]',10],['.fl-unused li',13],['#uefa-stats tbody tr',24],['.fc-card',9],['.fh-card',3],['.preview-card',4],['.report-timeline li',5],['.report-source',11],['[data-analyst-review]',1],['.fl-rating--unavailable',2]])assert.equal($(selector).length,count,selector);
 assert.equal($('[data-starting-player="1467236"] [data-player-rating]').attr('data-player-rating'),'9.0');
 assert.match($('.fl-recognition').text(),/لامين يامال/);
 for(const [key,values] of [['possession','35%,65%'],['attempts','5,22'],['on-target','3,10'],['passes-completed','227,643']])assert.equal($(`[data-stat="${key}"] td`).map((_,e)=>$(e).text()).get().join(','),values);
 assert.doesNotMatch($('main').text(),/روما|ريال مدريد|إندريك|مالين|أتلتيكو|يونايتد|كوليراكيس/);
 assert.equal($('iframe,video,script,[data-chart-source="espn"]').length,0);
});
test('Galatasaray references and Arabic review resolve to the exact match',()=>{
 const $=render();
 for(const a of $('a[href^="https://"]').toArray())assert.equal($(a).closest('#report-sources').length,1);
 for(const a of $('a[href^="#"]').toArray())assert.equal($($(a).attr('href')).length,1);
 const ids=$('[id]').map((_,e)=>$(e).attr('id')).get();assert.equal(new Set(ids).size,ids.length);
 assert.equal($('#source-ali-saed-review a').attr('href'),'https://www.youtube.com/watch?v=IMvuTFGF35g');
 assert.equal($('[data-analyst-review]').attr('data-review-scope'),'match');
 assert.match($('#arabic-reviews').text(),/الجزء المتاح من التفريغ/);
 assert.match($('#report-sources').text(),/29–71/);
 assert.equal($('[data-metric="possession"] .fc-value').map((_,e)=>$(e).text()).get().join(','),'35%,65%');
});
test('Galatasaray complete standings remain dated static snapshots with source ranks',()=>{
 const $=render();
 for(const [i,size] of [36,18,20].entries()){
  const card=$('[data-galatasaray-standing]').eq(i);
  assert.equal(card.find('tbody tr').length,size);assert.equal(card.attr('data-feed-state'),'snapshot');
  assert.equal(card.attr('data-reviewed-on'),'2026-10-16');assert.match(card.find('.fs-reading').text(),/لا تتحدث تلقائياً/);
 }
 assert.equal(report.standings[1].entries[0].teamId,'432');assert.equal(report.standings[1].entries[0].points,16);
 assert.equal(report.standings[1].entries[9].teamId,'7656');
 assert.equal(report.standings[0].entries.find(r=>r.teamId==='432').rank,35);
 assert.equal(report.standings[0].entries.find(r=>r.teamId==='83').rank,2);
 assert.equal(report.standings[2].entries[0].teamId,'83');assert.equal(report.standings[2].entries[0].points,24);
 for(const table of report.standings){
  assert.equal(new Set(table.entries.map(r=>r.rank)).size,table.entries.length);
  for(const r of table.entries){assert.equal(r.played,r.wins+r.draws+r.losses);assert.equal(r.goalDifference,r.goalsFor-r.goalsAgainst);assert.equal(r.points,3*r.wins+r.draws);}
 }
});
test('Galatasaray validator rejects mismatched fixtures and incomplete content',()=>{
 for(const change of [d=>d.matchId='2049581',d=>d.fotmobEventId='6106274',d=>d.kickoff='2026-10-14T19:00:00Z',d=>d.teams.reverse(),d=>d.teams[0].starters.pop(),d=>d.teams[1].starters[0].rating=11,d=>d.teams[0].substitutes[0].id=d.teams[0].starters[0].id,d=>d.stats[0][1].pop(),d=>d.stats[0][1][0][2]=-1,d=>d.stats[0][1][0][0]='possession',d=>d.events.pop(),d=>d.history.pop(),d=>d.standings.pop(),d=>d.standings[1].entries.pop(),d=>d.standings[1].league='ita.1',d=>d.reviews[0].matchId='2049581',d=>d.reviews[0].publishedOn='2022-03-17',d=>d.sources=d.sources.filter(s=>s[0]!=='ali-saed-review')]){
  const bad=structuredClone(report);change(bad);assert.throws(()=>validateGalatasarayBarcelona(bad));
 }
});
test('Galatasaray central metadata has a complete original article and no duplicated event',async()=>{
 const seo=getLegacyAnalysisSeo('galatasaray-barcelona');const graph=seo.jsonLd;
 const page=graph.find(n=>n['@type']==='WebPage');const article=graph.find(n=>n['@type']==='Article');
 assert.equal(page.mainEntity['@id'],article['@id']);assert.equal(article.mainEntityOfPage['@id'],page['@id']);
 for(const key of ['headline','description','image','inLanguage','datePublished','dateModified','author','publisher'])assert.ok(article[key],key);
 assert.equal(article.headline,seo.title);assert.equal(article.image.width,1200);assert.equal(article.image.height,630);
 assert.equal(graph.filter(n=>['SportsEvent','Organization','WebSite'].includes(n['@type'])).length,0);
 const sitemap=await fs.readFile(new URL('../public/sitemap-0.xml',import.meta.url),'utf8');
 for(const route of ['galatasaray-barcelona/','galatasaray-barcelona/watch/'])assert.ok(sitemap.includes(`<loc>https://streammasterstore.com/${route}</loc><lastmod>2026-10-16</lastmod>`));
});
