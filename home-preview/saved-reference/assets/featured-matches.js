/* The same scoreboard proxy, parser, leagues and Cairo-day filtering as the homepage. */
import {LEAGUES,dayInZone,dayLabel,shiftDay,kickoff,scoreboardUrl,readScoreboardResponse,matchesForDay,hasCompleteScore} from './matches.js?v=88b50ea7ae96f5eb';
import {arabicTeamName} from './team-names-ar.js?v=88b50ea7ae96f5eb';
const root=document.querySelector('.sm-matches');
if(root){
 const tabs=Array.from(root.querySelectorAll('[data-day]')),rail=root.querySelector('.sm-matches__rail'),status=root.querySelector('.sm-matches__status'),retry=root.querySelector('.sm-matches__retry'),dateLabel=root.querySelector('.sm-matches__date'),arrows=root.querySelector('.sm-matches__arrows');
 const zone='Africa/Cairo', cache=new Map(), pending=new Map();
 let selected='today',visible=false,run=0;
 const text=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=value;return e};
 function selectedDay(){const today=dayInZone(new Date(),zone);return shiftDay(today,selected==='yesterday'?-1:selected==='tomorrow'?1:0)}
 function tile(match,index){
  const card=text('article','sm-match',''),top=text('div','sm-match__top','');card.dataset.state=match.state;
  const art=text('span','sm-match__art','');art.setAttribute('aria-hidden','true');
  const number=text('span','sm-match__number',String(index+1).padStart(2,'0'));number.setAttribute('aria-hidden','true');
  top.append(text('span','',LEAGUES.find(l=>l.id===match.league)?.name||'مباراة'),text('span','',match.state==='live'?'مباشر':match.state==='finished'?'انتهت':match.state==='other'?match.detail:'قادمة'));
  const teams=text('div','sm-match__teams','');
  function side(team){const el=text('div','sm-match__team',''),name=arabicTeamName(team.name);const fallback=()=>{const mark=text('span','sm-match__team-mark',Array.from(name.trim())[0]||'•');mark.setAttribute('aria-hidden','true');el.prepend(mark)};if(team.logo){const img=document.createElement('img');img.src=team.logo;img.alt='';img.loading='lazy';img.addEventListener('error',()=>{img.remove();fallback()});el.append(img)}else fallback();el.append(text('strong','',name));return el}
  const showScore=(match.state==='live'||match.state==='finished')&&hasCompleteScore(match.home.score,match.away.score);
  const center=text('div','sm-match__center','');
  const centerLabel=match.state==='live'?'النتيجة الآن':match.state==='finished'?'النتيجة النهائية':match.state==='scheduled'?'تبدأ الساعة':'الحالة';
  const score=showScore?`${match.home.score} : ${match.away.score}`:match.state==='scheduled'?kickoff(match.date,zone):'—';
  center.append(text('span','sm-match__center-label',centerLabel),text('span','sm-match__score',score));
  teams.append(side(match.home),center,side(match.away));
  const bottom=text('div','sm-match__time','');
  bottom.append(text('span',match.state==='live'?'is-live':'',match.state==='live'?match.detail:match.state==='finished'?'النتيجة النهائية':match.state==='other'?match.detail:'موعد البداية'),text('span','',kickoff(match.date,zone)+' · القاهرة'));
  const timing=text('div','sm-match__timing','');
  if(match.state==='scheduled'){
   timing.dataset.kickoff=match.date;
   timing.append(text('span','sm-match__timing-label','الوقت المتبقي'),text('div','sm-match__countdown',''));
   updateCountdown(timing,Date.now());
  }else if(match.state==='live'){
   timing.append(text('span','sm-match__timing-label','وقت المباراة'),text('span','sm-match__live-clock',match.detail||'مباشر'));
  }else timing.hidden=true;
  card.append(art,number,top,teams,timing,bottom);return card;
 }
 function updateCountdown(timing,now){
  const remaining=Date.parse(timing.dataset.kickoff)-now,box=timing.querySelector('.sm-match__countdown');
  if(!Number.isFinite(remaining)||remaining<=0){box.textContent='بانتظار تأكيد البداية';return}
  const total=Math.floor(remaining/1000),days=Math.floor(total/86400);
  const units=[...(days?[['أيام',days]]:[]),['ساعات',Math.floor(total%86400/3600)],['دقائق',Math.floor(total%3600/60)],['ثوانٍ',total%60]];
  const digits=n=>String(n).padStart(2,'0').replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  box.replaceChildren(...units.map(([label,value])=>{const cell=text('span','sm-match__countdown-cell','');cell.append(text('b','',digits(value)),text('small','',label));return cell}));
 }
 function tick(){if(!visible||document.hidden)return;const now=Date.now();rail.querySelectorAll('[data-kickoff]').forEach(el=>updateCountdown(el,now))}
 async function load(day,force=false,onProgress){
  const saved=cache.get(day);if(!force&&saved&&Date.now()-saved.loadedAt<60000){onProgress(saved,true);return saved}
  const existing=pending.get(day);
  if(existing){existing.subscribers.add(onProgress);try{return await existing.promise}finally{existing.subscribers.delete(onProgress)}}
  const subscribers=new Set([onProgress]),matches=[],seen=new Set();let failed=0,stale=0,done=0,next=0;
  const rank=m=>m.state==='live'?0:m.state==='scheduled'?1:2;
  function progress(){
   const ordered=matches.slice().sort((a,b)=>rank(a)-rank(b)||Date.parse(a.date)-Date.parse(b.date)||a.id.localeCompare(b.id));
   const record={matches:ordered,failed,stale,loadedAt:Date.now()};
   subscribers.forEach(fn=>fn(record,done===LEAGUES.length));return record;
  }
  async function worker(){
   while(next<LEAGUES.length){
    const league=LEAGUES[next++],controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
     const response=await fetch(scoreboardUrl(league.id,day),{signal:controller.signal,cache:'no-store'});
     const result=await readScoreboardResponse(response,league);if(result.stale)stale++;
     for(const match of matchesForDay(result.matches,day,zone))if(!seen.has(match.id)){seen.add(match.id);matches.push(match)}
    }catch(_){failed++}finally{clearTimeout(timer);done++;progress()}
   }
  }
  const task={subscribers,promise:null};
  task.promise=(async()=>{await Promise.all(Array.from({length:6},worker));const record=progress();cache.set(day,record);return record})().finally(()=>pending.delete(day));
  pending.set(day,task);try{return await task.promise}finally{subscribers.delete(onProgress)}
 }
 function updateArrows(){
  const range=Math.max(0,rail.scrollWidth-rail.clientWidth),position=Math.max(0,-rail.scrollLeft);
  root.querySelector('[data-direction=previous]').disabled=position<=1;
  root.querySelector('[data-direction=next]').disabled=position>=range-1;
 }
 let renderedView='',signature='';
 function fill(matches){const next=JSON.stringify(matches);if(next===signature)return;signature=next;const position=rail.scrollLeft;rail.replaceChildren(...matches.map(tile));rail.scrollLeft=position;arrows.hidden=!matches.length;requestAnimationFrame(updateArrows)}
 async function render(force=false){
  const current=++run,day=selectedDay(),view=selected,key=day+':'+view;
  dateLabel.textContent=dayLabel(day,{weekday:'long',year:'numeric'})+' · توقيت القاهرة';
  tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.day===view)));
  if(key!==renderedView){renderedView=key;signature='';rail.replaceChildren();rail.scrollLeft=0;arrows.hidden=true}
  retry.hidden=true;
  if(!visible){status.textContent='تظهر المباريات عند الوصول إلى القسم.';return}
  status.textContent='جارٍ تحديث المباريات من المصدر…';
  function show(data,complete){
   if(current!==run)return;
   const items=view==='live'?data.matches.filter(m=>m.state==='live'):data.matches;
   if(items.length)fill(items);
   else if(complete){rail.replaceChildren();signature='';arrows.hidden=true}
   if(!complete){status.textContent='جارٍ تحديث المباريات من المصدر…';return}
   if(data.failed===LEAGUES.length){status.textContent='تعذّر تحميل المباريات من المصدر حالياً. يرجى المحاولة مجدداً أو زيارة صفحة المباريات.';retry.hidden=false;return}
   retry.hidden=!(data.failed||data.stale);
   const warning=data.failed||data.stale?'بعض البطولات تعذّر تحديثها أو بياناتها قديمة.':'';
   status.textContent=items.length?warning:(view==='live'?'لا توجد مباريات مباشرة مؤكدة حالياً.':'لا توجد مباريات مؤكدة لهذا اليوم.')+(warning?' '+warning:'');
  }
  await load(day,force,show);
 }
 tabs.forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.day;render()}));
 retry.addEventListener('click',()=>render(true));
 root.querySelectorAll('[data-direction]').forEach(button=>button.addEventListener('click',()=>{const card=rail.querySelector('.sm-match');if(!card)return;const distance=card.getBoundingClientRect().width+(parseFloat(getComputedStyle(rail).gap)||0);rail.scrollBy({left:button.dataset.direction==='next'?-distance:distance,behavior:window.smMotion.matches?'auto':'smooth'})}));
 rail.addEventListener('scroll',updateArrows,{passive:true});window.addEventListener('resize',updateArrows);
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{const was=visible;visible=entries.some(e=>e.isIntersecting);if(visible&&!was)render()},{rootMargin:'200px'}).observe(root);else{visible=true;render()}
 setInterval(tick,1000);
 setInterval(()=>{if(visible&&!document.hidden)render(true)},60000);
 document.addEventListener('visibilitychange',tick);
 if(location.hash==='#featured-matches'){
  let moved=false;
  const cancel=()=>{moved=true};
  window.addEventListener('wheel',cancel,{once:true,passive:true});
  window.addEventListener('touchstart',cancel,{once:true,passive:true});
  const restore=()=>setTimeout(()=>{if(!moved){const top=window.scrollY+root.getBoundingClientRect().top;window.scrollTo({top,behavior:'auto'})}},1800);
  if(document.readyState==='complete')restore();else window.addEventListener('load',restore,{once:true});
 }

}
