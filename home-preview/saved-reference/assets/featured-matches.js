/* The same scoreboard proxy, parser, leagues and Cairo-day filtering as the homepage. */
import {LEAGUES,dayInZone,dayLabel,shiftDay,kickoff,scoreboardUrl,readScoreboardResponse,matchesForDay,hasCompleteScore} from './matches.js?v=12c8fd5692dc609d';
import {arabicTeamName} from './team-names-ar.js?v=12c8fd5692dc609d';
const root=document.querySelector('.sm-matches');
if(root){
 const tabs=Array.from(root.querySelectorAll('[data-day]')),rail=root.querySelector('.sm-matches__rail'),status=root.querySelector('.sm-matches__status'),retry=root.querySelector('.sm-matches__retry'),dateLabel=root.querySelector('.sm-matches__date'),arrows=root.querySelector('.sm-matches__arrows');
 const zone='Africa/Cairo', cache=new Map(), pending=new Map();
 const isEnglish=()=>document.documentElement.dataset.referenceLanguage==='en';
 const teamName=team=>isEnglish()?team.name:arabicTeamName(team.name);
 let selected='today',visible=false,run=0;
 const openDrawers=new Set();
 const text=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=value;return e};
 function selectedDay(){const today=dayInZone(new Date(),zone);return shiftDay(today,selected==='yesterday'?-1:selected==='tomorrow'?1:0)}
 function tile(match,index){
  const wrap=text('div','sm-match-wrap',''),card=text('article','sm-match',''),top=text('div','sm-match__top','');card.dataset.state=match.state;wrap.dataset.matchId=match.id;
  const art=text('span','sm-match__art','');art.setAttribute('aria-hidden','true');
  const number=text('span','sm-match__number',String(index+1).padStart(2,'0'));number.setAttribute('aria-hidden','true');
  const topStatus=text('span','sm-match__top-status',match.state==='live'?'مباشر':match.state==='finished'?'انتهت':match.state==='other'?match.detail:'قادمة');
  top.append(text('span','',LEAGUES.find(l=>l.id===match.league)?.name||'مباراة'),topStatus);
  const teams=text('div','sm-match__teams','');
  function side(team){const el=text('div','sm-match__team',''),name=teamName(team);const fallback=()=>{const mark=text('span','sm-match__team-mark',Array.from(name.trim())[0]||'•');mark.setAttribute('aria-hidden','true');el.prepend(mark)};if(team.logo){const img=document.createElement('img');img.src=team.logo;img.alt='';img.loading='lazy';img.addEventListener('error',()=>{img.remove();fallback()});el.append(img)}else fallback();el.append(text('strong','',name));return el}
  const showScore=(match.state==='live'||match.state==='finished')&&hasCompleteScore(match.home.score,match.away.score);
  const center=text('div','sm-match__center','');
  const centerLabel=match.state==='live'?'النتيجة الآن':match.state==='finished'?'النتيجة النهائية':match.state==='scheduled'?'تبدأ الساعة':'الحالة';
  const score=showScore?`${match.away.score} : ${match.home.score}`:match.state==='scheduled'?kickoff(match.date,zone):'—';
  const scoreElement=text('span','sm-match__score',score);
  if(showScore)scoreElement.setAttribute('aria-label',`${teamName(match.home)} ${match.home.score}${isEnglish()?', ':'، '}${teamName(match.away)} ${match.away.score}`);
  center.append(text('span','sm-match__center-label',centerLabel),scoreElement);
  teams.append(side(match.home),center,side(match.away));
  const bottom=text('div','sm-match__time','');
  bottom.append(text('span',match.state==='live'?'is-live':'',match.state==='live'?match.detail:match.state==='finished'?'النتيجة النهائية':match.state==='other'?match.detail:'موعد البداية'),text('span','',kickoff(match.date,zone)+(isEnglish()?' · Cairo':' · القاهرة')));
  const timing=text('div','sm-match__timing','');
  if(match.state==='scheduled'){
   timing.dataset.kickoff=match.date;
   timing.append(text('span','sm-match__timing-label','الوقت المتبقي'),text('div','sm-match__countdown',''));
   updateCountdown(timing,Date.now());
  }else if(match.state==='live'){
   timing.append(text('span','sm-match__timing-label','وقت المباراة'),text('span','sm-match__live-clock',match.detail||'مباشر'));
  }else timing.hidden=true;
  card.append(art,number,top,teams,timing,bottom);wrap.append(card);
  if(match.state==='live'||match.state==='finished'){
   const button=text('button','sm-match__events-toggle','أحداث المباراة');button.type='button';button.setAttribute('aria-expanded',String(openDrawers.has(match.id)));
   const icon=text('span','sm-match__events-chevron','⌄');icon.setAttribute('aria-hidden','true');button.append(icon);topStatus.append(button);
   const drawer=text('div','sm-match__events','');drawer.id='sm-match-events-'+index;button.setAttribute('aria-controls',drawer.id);drawer.hidden=!openDrawers.has(match.id);wrap.append(drawer);
   function paint(){
    const rows=Array.isArray(match.incidents)?match.incidents:[];drawer.replaceChildren();
    if(!rows.length){drawer.append(text('p','sm-match__events-empty','الأحداث غير متاحة من المصدر حالياً.'));return}
    drawer.append(text('p','sm-match__events-note','الأحداث المتاحة من المصدر'));const list=document.createElement('ul');list.className='sm-match__events-list';
    const minuteValue=value=>{const parts=String(value).match(/\d+/g);return parts?Number(parts[0])*1000+Number(parts[1]||0):Number.MAX_SAFE_INTEGER};
    rows.map((row,i)=>({row,i})).sort((a,b)=>minuteValue(a.row.minute)-minuteValue(b.row.minute)||a.i-b.i).forEach(({row})=>{
     const li=text('li','sm-match__event',''),symbol=text('span','sm-match__event-icon sm-match__event-icon--'+row.kind,row.kind==='goal'?'⚽':'');symbol.setAttribute('aria-hidden','true');
     const content=text('span','sm-match__event-copy',''),kind=isEnglish()?(row.kind==='goal'?(row.ownGoal?'Own goal':'Goal'):row.kind==='yellow'?'Yellow card':'Red card'):(row.kind==='goal'?(row.ownGoal?'هدف في مرماه':'هدف'):row.kind==='yellow'?'بطاقة صفراء':'بطاقة حمراء');
     content.append(text('strong','',row.player),text('small','',`${teamName(match[row.side])} · ${kind}`));const minute=text('span','sm-match__event-minute',row.minute);minute.dir='ltr';li.append(symbol,content,minute);list.append(li);
    });drawer.append(list);
   }
   if(!drawer.hidden)paint();button.addEventListener('click',()=>{const opening=drawer.hidden;drawer.hidden=!opening;button.setAttribute('aria-expanded',String(opening));if(opening){openDrawers.add(match.id);paint()}else openDrawers.delete(match.id)});
  }
  return wrap;
 }
 function updateCountdown(timing,now){
  const remaining=Date.parse(timing.dataset.kickoff)-now,box=timing.querySelector('.sm-match__countdown');
  if(!Number.isFinite(remaining)||remaining<=0){box.textContent='بانتظار تأكيد البداية';return}
  const total=Math.floor(remaining/1000),days=Math.floor(total/86400);
  const units=[...(days?[['أيام',days]]:[]),['ساعات',Math.floor(total%86400/3600)],['دقائق',Math.floor(total%3600/60)],['ثوانٍ',total%60]];
  const digits=n=>isEnglish()?String(n).padStart(2,'0'):String(n).padStart(2,'0').replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);
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
 function fill(matches){const next=JSON.stringify(matches);if(next===signature)return;signature=next;const position=rail.scrollLeft,focused=document.activeElement?.closest('.sm-match-wrap')?.dataset.matchId,restoreFocus=document.activeElement?.classList.contains('sm-match__events-toggle');rail.replaceChildren(...matches.map(tile));rail.scrollLeft=position;if(restoreFocus&&focused){const target=[...rail.querySelectorAll('.sm-match-wrap')].find(el=>el.dataset.matchId===focused);target?.querySelector('.sm-match__events-toggle')?.focus({preventScroll:true})}arrows.hidden=!matches.length;requestAnimationFrame(updateArrows)}
 async function render(force=false){
  const current=++run,day=selectedDay(),view=selected,key=day+':'+view;
  dateLabel.textContent=isEnglish()?new Intl.DateTimeFormat('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'))+' · Cairo time':dayLabel(day,{weekday:'long',year:'numeric'})+' · توقيت القاهرة';
  tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.day===view)));
  if(key!==renderedView){openDrawers.clear();renderedView=key;signature='';rail.replaceChildren();rail.scrollLeft=0;arrows.hidden=true}
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
 window.addEventListener('sm-reference-language-change',()=>{signature='';render();if(!visible){const cached=cache.get(selectedDay());if(cached)fill(selected==='live'?cached.matches.filter(match=>match.state==='live'):cached.matches)}});
 if(location.hash==='#featured-matches'){
  let moved=false;
  const cancel=()=>{moved=true};
  window.addEventListener('wheel',cancel,{once:true,passive:true});
  window.addEventListener('touchstart',cancel,{once:true,passive:true});
  const restore=()=>setTimeout(()=>{if(!moved){const top=window.scrollY+root.getBoundingClientRect().top;window.scrollTo({top,behavior:'auto'})}},1800);
  if(document.readyState==='complete')restore();else window.addEventListener('load',restore,{once:true});
 }

}
