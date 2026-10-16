import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {load} from 'cheerio';
import {renderMatchAnalysis} from './render-match-analysis.mjs';
import {NAV_GROUPS,activeGroupKey} from '../src/navigation.mjs';
const base=new URL('../',import.meta.url);
const data=JSON.parse(await fs.readFile(new URL('src/content/match-analysis.json',base),'utf8'));
const template=await fs.readFile(new URL('legacy/match-analysis/index.html',base),'utf8');
test('analysis collection renders four short cards matching the existing reports',async()=>{
 const $=load(template);renderMatchAnalysis($,data);
 assert.equal($('.ma-card').length,4);assert.equal($('#reports-title').text(),'الجولة الثانية');assert.equal($('#reports .ma-card').length,4);assert.equal($('.ma-scoreboard img').length,8);assert.equal($('.ma-banner-image,.ma-banner,.ma-photo-credit,.ma-photo-rights').length,0);
 assert.equal($('.ma-card img').length,8);
 const graph=JSON.parse($('script[type="application/ld+json"]').text())['@graph'];
 const list=graph.find(n=>n['@type']==='CollectionPage').mainEntity;
 assert.equal(list.numberOfItems,4);
 for(const [i,r] of data.reports.entries()){
  const target=load(await fs.readFile(new URL(`legacy/${r.slug}/index.html`,base),'utf8'));
  assert.equal(target('.fixture-final-result').attr('aria-label'),`النتيجة النهائية: ${r.home} ${r.homeScore}، ${r.away} ${r.awayScore}`);
  assert.equal(target('.match-meta time').attr('datetime'),r.date);
  const card=$(`[data-report="${r.slug}"]`);
  assert.equal(card.find('.ma-open').attr('href'),`/${r.slug}/`);
  assert.equal(card.find('time').attr('datetime'),r.date);
  assert.equal(card.find('h3').attr('id'),card.attr('aria-labelledby'));
  assert.ok(r.summary.length<240);
  for(const img of card.find('img').toArray())await fs.access(new URL('public'+$(img).attr('src'),base));
  assert.equal(list.itemListElement[i].url,`https://streammasterstore.com/${r.slug}/`);
 }
 assert.equal($('main script,iframe,video').length,0);
});
test('the four reports and their follow pages link back to their analysis parent',async()=>{
 for(const r of data.reports)for(const suffix of ['','watch/']){
  const $=load(await fs.readFile(new URL(`legacy/${r.slug}/${suffix}index.html`,base),'utf8'));
  assert.equal($('main nav[aria-label="مسار التنقل"] a[href="/match-analysis/"]').length,1);
  const nodes=$('script[type="application/ld+json"]').toArray().flatMap(e=>{const d=JSON.parse($(e).text());return d['@graph']||[d];});
  const crumbs=nodes.find(n=>n['@type']==='BreadcrumbList').itemListElement;
  assert.equal(crumbs[1].name,'تحليل المباريات');
  assert.equal(crumbs[1].item,'https://streammasterstore.com/match-analysis/');
 }
 const group=NAV_GROUPS.find(g=>g.key==='analysis');assert.equal(group.links[0].href,'match-analysis/');assert.equal(group.links[0].label,'دوري أبطال أوروبا — موسم 2026/2027');
 for(const route of ['match-analysis',...data.reports.map(r=>r.slug)])assert.equal(activeGroupKey('/'+route+'/'),'analysis');
});
test('analysis collection refuses malformed or duplicate card identities',()=>{
 for(const change of [d=>d.reports.pop(),d=>d.reports[1].slug=d.reports[0].slug,d=>d.reports[0].slug='../invalid',d=>d.reports[0].homeScore=-1 ]){
  const bad=structuredClone(data);change(bad);assert.throws(()=>renderMatchAnalysis(load(template),bad));
 }
});
