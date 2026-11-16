/* Same standings validation and rates calculation used by the live homepage. */
import {validateStandings, leagueStandingsByLeague, standingsUrl} from './standings.js';
import {standingsRates} from './fixtures-archive.js';
import {providerTeamLogo} from './leader-logo.js';

const section=document.querySelector('.sm-leagues');
if (section) {
  const buttons=Array.from(section.querySelectorAll('.sm-leagues__mini button'));
  const ids=['uefa.champions','eng.1','fra.1','esp.1','ger.1','ita.1','ksa.1','egy.1'];
  const records={}, requested=new Map(), inFlight=new Set();
  let active=0, visible=false, snapshotReady=false;
  const fmt=new Intl.NumberFormat('ar-EG');
  function writeStat(key, team, value) {
    const box=section.querySelector('[data-stat="'+key+'"]');
    const title=box.querySelector('strong'); title.replaceChildren();
    if(team){
      const url=providerTeamLogo({teamId:team.teamId,provider:records[ids[active]]?.table.provider,logo:null});
      if(url){const img=document.createElement('img');img.className='sm-leagues__crest';img.alt='';img.loading='lazy';img.src=url;img.addEventListener('error',()=>img.remove());title.append(img)}
      const name=document.createElement('bdi');name.dir='auto';name.textContent=team.name;title.append(name);
    } else title.textContent=key==='goals'&&value!=null?fmt.format(value):'غير متاح';
    box.querySelector('small').textContent=key==='leader'&&value!=null?fmt.format(value)+' نقطة':(key==='attack'||key==='defence')&&value!=null?value.toFixed(2)+' هدف/مباراة':key==='goals'&&value!=null?'هدفاً':'';
  }
  function render(){
    const record=records[ids[active]],table=record?.table;
    if(!table){['leader','attack','defence','goals'].forEach(k=>writeStat(k,null,null));section.querySelector('.sm-leagues__stat-source').textContent=snapshotReady?'الإحصائيات غير متاحة حالياً':'جارٍ تحميل الإحصائيات';return}
    const rates=standingsRates(table.entries),leader=table.entries.find(e=>e.rank===1),attack=rates.bestAttack[0],defence=rates.bestDefence[0];
    writeStat('leader',leader,leader?.points);
    writeStat('attack',attack,attack?.attack);
    writeStat('defence',defence,defence?.defence);
    writeStat('goals',null,rates.rows.length?rates.league.totalGoals:null);
    const date=new Intl.DateTimeFormat('ar-EG',{day:'numeric',month:'long',year:'numeric',timeZone:'Africa/Cairo'}).format(new Date(table.fetchedAt));
    section.querySelector('.sm-leagues__stat-source').textContent=(record.live?(record.stale?'بيانات قديمة':'آخر قراءة'):'لقطة محفوظة')+' · '+date+' · '+table.provider+' · معدلات الأهداف لكل مباراة';
  }
  async function refresh(i){
    const id=ids[i];if(!visible||!snapshotReady||document.hidden||inFlight.has(id)||Date.now()-(requested.get(id)||0)<120000)return;inFlight.add(id);requested.set(id,Date.now());
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(standingsUrl(id),{signal:controller.signal,cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error('UNAVAILABLE');
      const table=validateStandings(await response.json(),id),old=records[id]?.table;
      if(!old||(table.season>=old.season&&Date.parse(table.fetchedAt)>=Date.parse(old.fetchedAt))){
        records[id]={table,live:true,stale:table.stale||response.headers.get('X-Standings-Cache')==='STALE'};
        if(i===active)render();
      }
    }catch(_){}finally{clearTimeout(timer);inFlight.delete(id)}
  }
  function sync(){const i=buttons.findIndex(b=>b.getAttribute('aria-pressed')==='true');if(i<0)return;active=i;render();refresh(i)}
  const observer=new MutationObserver(sync);buttons.forEach(b=>observer.observe(b,{attributes:true,attributeFilter:['aria-pressed']}));
  if('IntersectionObserver' in window){new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){visible=true;refresh(active)}},{rootMargin:'300px'}).observe(section.querySelector('.sm-leagues__stage'))}
  else visible=true;
  sync();
  setInterval(()=>refresh(active),120000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(active)});
  try{
    const response=await fetch(new URL('./standings-snapshot.json',import.meta.url));
    if(!response.ok)throw new Error('SNAPSHOT_UNAVAILABLE');
    const snapshot=await response.json();
    for(const id of ids){try{records[id]={table:leagueStandingsByLeague(snapshot,id),live:false,stale:true}}catch(_){}}
  }catch(_){}finally{snapshotReady=true;render();refresh(active)}
}
