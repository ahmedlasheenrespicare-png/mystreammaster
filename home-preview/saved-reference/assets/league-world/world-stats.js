/* Use the same verified source and calculations as the league section. */
import {validateStandings,leagueStandingsByLeague,standingsUrl} from '/home-preview/saved-reference/assets/standings.js?v=b8df2934c40c8350';
import {standingsRates} from '/home-preview/saved-reference/assets/fixtures-archive.js?v=b8df2934c40c8350';
import {providerTeamLogo} from '/home-preview/saved-reference/assets/leader-logo.js?v=b8df2934c40c8350';
const ids=['uefa.champions','eng.1','fra.1','esp.1','ger.1','ita.1','ksa.1','egy.1'];
const cards=[...document.querySelectorAll('.world .cards > .card')],records=new Map(),pending=new Set(),requested=new Map();
const fmt=new Intl.NumberFormat('ar-EG');let snapshotReady=false;
const extraCrests={'al qadsiah':'al-qadsiah','al assiouty sport':'pyramids-fc','internazionale':'internazionale','as monaco':'as-monaco','sc freiburg':'sc-freiburg'};
function showCrest(container,team,provider){
 container.replaceChildren();container.classList.add('card-stat-crest');container.dir='rtl';
 const key=(team.name||'').trim().toLowerCase(),id=window.kotaTeamCrests?.[key],local=id?'/home-preview/saved-reference/assets/league-world/team-crests/'+id+'.png':extraCrests[key]?'/images/teams/'+extraCrests[key]+'-club-badge.webp':null;
 const remote=providerTeamLogo({teamId:team.teamId,provider,logo:team.logo});const sources=[local,remote].filter(Boolean);const fallback=()=>{container.textContent='الشعار غير متاح';container.setAttribute('aria-label','شعار '+team.name+' غير متاح')};
 if(!sources.length){fallback();return}container.removeAttribute('aria-label');const img=document.createElement('img');img.alt='شعار '+team.name;img.decoding='async';let current=0;img.onerror=()=>{if(++current<sources.length)img.src=sources[current];else fallback()};img.src=sources[0];container.append(img);
}

function render(i){
 const card=cards[i],record=records.get(ids[i]);if(!card)return;
 const write=(key,team,value)=>{const box=card.querySelector('[data-stat="'+key+'"]'),name=box.querySelector('strong'),detail=box.querySelector('small');if(team)showCrest(name,team,record?.table.provider);else{name.removeAttribute('aria-label');name.classList.remove('card-stat-crest');name.textContent=key==='goals'&&typeof value==='number'?fmt.format(value):'غير متاح';name.dir='rtl'}detail.textContent=key==='leader'&&value!=null?fmt.format(value)+' نقطة':(key==='attack'||key==='defence')&&value!=null?value.toFixed(2)+' هدف/مباراة':key==='goals'&&value!=null?'هدفًا':''};
 if(!record){if(snapshotReady){for(const key of ['leader','attack','defence','goals'])write(key,null,null)}return}
 const table=record.table,rates=standingsRates(table.entries),leader=table.entries.find(t=>t.rank===1),attack=rates.bestAttack[0],defence=rates.bestDefence[0];
 write('leader',leader,leader?.points);write('attack',attack,attack?.attack);write('defence',defence,defence?.defence);write('goals',null,rates.rows.length?rates.league.totalGoals:null);
}
async function refresh(i){
 if(!Number.isInteger(i)||i<0||i>=ids.length)return;render(i);const id=ids[i];if(pending.has(id)||Date.now()-(requested.get(id)||0)<120000)return;requested.set(id,Date.now());pending.add(id);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch(standingsUrl(id),{signal:controller.signal,cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});if(!response.ok)throw Error('unavailable');const table=validateStandings(await response.json(),id),old=records.get(id)?.table;if(!old||(table.season>=old.season&&Date.parse(table.fetchedAt)>=Date.parse(old.fetchedAt)))records.set(id,{table,live:true,stale:table.stale||response.headers.get('X-Standings-Cache')==='STALE'})}catch{}finally{clearTimeout(timer);pending.delete(id);render(i)}
}
window.refreshLeagueCard=refresh;
function refreshVisibleCard(){if(document.hidden)return;const i=cards.findIndex(card=>card.classList.contains('is-flipped'));if(i>=0)refresh(i)}
setInterval(refreshVisibleCard,120000);document.addEventListener('visibilitychange',refreshVisibleCard);
try{const response=await fetch('/home-preview/saved-reference/assets/standings-snapshot.json?v=b8df2934c40c8350');if(!response.ok)throw Error('unavailable');const snapshot=await response.json();for(const id of ids){try{const table=leagueStandingsByLeague(snapshot,id),old=records.get(id)?.table;if(!old||(table.season>=old.season&&Date.parse(table.fetchedAt)>Date.parse(old.fetchedAt)))records.set(id,{table,live:false,stale:true})}catch{}}}catch{}finally{snapshotReady=true;cards.forEach((card,i)=>{render(i);if(card.classList.contains('is-flipped'))refresh(i)})}
