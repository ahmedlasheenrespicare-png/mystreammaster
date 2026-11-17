/* Scroll-linked competition gallery, scoped to this preview. */
(function(){
 const section=document.querySelector('.sm-leagues'); if(!section) return;
 const stage=section.querySelector('.sm-leagues__stage');
 const cards=Array.from(section.querySelectorAll('.sm-leagues__card'));
 const strip=section.querySelector('.sm-leagues__mini');
 const buttons=Array.from(strip.querySelectorAll('button'));
 const motion=window.smMotion;
 // Neighbouring works recall the reference's wide, horizontal Playbook strip.
 const rail=section.querySelector('.sm-leagues__cards');
 const neighbours=[-1,1].map((direction)=>{
  const button=document.createElement('button');
  button.type='button'; button.className='sm-leagues__neighbour '+(direction<0?'is-previous':'is-next');
  const title=document.createElement('span'); title.className='sm-leagues__neighbour-title';
  const image=document.createElement('span'); image.className='sm-leagues__image'; image.setAttribute('aria-hidden','true');
  const img=document.createElement('img'); img.alt=''; const fallback=document.createElement('span');
  image.append(img,fallback);button.append(title,image);rail.append(button);
  img.addEventListener('error',()=>image.classList.add('is-failed'));
  button.addEventListener('click',()=>go(Number(button.dataset.index)));
  return {button,title,img,image,fallback,direction};
 });
 let selected=-1, raf=0, frames=0, lastTop=null;
 function select(i){
  i=Math.max(0,Math.min(cards.length-1,i)); if(i===selected)return;
  section.style.setProperty('--league-enter-x', i>selected?'24px':'-24px');
  section.style.setProperty('--league-progress', String(i/(cards.length-1))); selected=i;
  cards.forEach((card,n)=>{const on=n===i;card.hidden=!on;card.inert=!on;card.setAttribute('aria-hidden',String(!on));});
  buttons.forEach((button,n)=>{button.setAttribute('aria-pressed',String(n===i));if(n===i)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
  section.style.setProperty('--league-accent',cards[i].dataset.accent);
  section.querySelector('.sm-leagues__count').textContent=String(i+1).padStart(2,'0')+' / 08';
  neighbours.forEach(({button,title,img,image,fallback,direction})=>{
   const index=i===0&&direction<0?2:i===cards.length-1&&direction>0?cards.length-3:i+direction; button.hidden=index<0||index>=cards.length; button.dataset.index=String(index);
   if(button.hidden)return;
   const card=cards[index], name=card.querySelector('h3').textContent;
   button.style.background=card.style.getPropertyValue('--card-bg');
   button.classList.toggle('is-light',index===3);
   button.setAttribute('aria-label','اختر '+name); title.textContent=name;
   fallback.textContent=card.querySelector('.sm-leagues__image span').textContent;
   image.classList.remove('is-failed');img.src=card.querySelector('img').src;
   if(img.complete&&!img.naturalWidth)image.classList.add('is-failed');
  });
  const bounds=strip.getBoundingClientRect(), active=buttons[i].getBoundingClientRect();
  if(active.left<bounds.left) strip.scrollLeft+=active.left-bounds.left-4;
  else if(active.right>bounds.right) strip.scrollLeft+=active.right-bounds.right+4;
 }
 function update(){
  raf=0; const rect=section.getBoundingClientRect(); const span=Math.max(1,section.offsetHeight-stage.offsetHeight);
  const offset=Math.max(0,Math.min(span,-rect.top));
  stage.style.transform='translate3d(0,'+offset.toFixed(2)+'px,0)';
  if(!section.classList.contains('sm-leagues--panel-open'))select(Math.min(cards.length-1,Math.floor((offset/span)*cards.length)));
  const changed=lastTop===null||Math.abs(rect.top-lastTop)>.15;lastTop=rect.top;
  if(changed)frames=120;else frames--;
  if(frames>0 && rect.top<innerHeight && rect.bottom>0)raf=requestAnimationFrame(update);
 }
 function schedule(){frames=120;if(!raf)raf=requestAnimationFrame(update)}
 function go(i){
  const span=Math.max(0,section.offsetHeight-stage.offsetHeight);
  const top=window.scrollY+section.getBoundingClientRect().top+span*((i+.15)/cards.length);
  window.scrollTo({top,behavior:motion.matches?'auto':'smooth'});schedule();
 }
 buttons.forEach((button,i)=>button.addEventListener('click',()=>section.classList.contains('sm-leagues--panel-open')?select(i):go(i)));
 window.smLeagueGallery={select,go,getSelected:()=>selected};
 strip.addEventListener('wheel',event=>{
  if(event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>=Math.abs(event.deltaY)||!event.deltaY)return;
  const max=strip.scrollWidth-strip.clientWidth;if(max<=0)return;
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?strip.clientWidth:1);
  const before=strip.scrollLeft;strip.scrollLeft+=getComputedStyle(strip).direction==='rtl'?-delta:delta;
  if(strip.scrollLeft!==before)event.preventDefault();
 },{passive:false});
 section.querySelectorAll('img').forEach(img=>{const fail=()=>img.closest('.sm-leagues__image')?.classList.add('is-failed');img.addEventListener('error',fail);if(img.complete&&!img.naturalWidth)fail()});
 section.classList.add('is-ready');select(0);window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);schedule();
})();
