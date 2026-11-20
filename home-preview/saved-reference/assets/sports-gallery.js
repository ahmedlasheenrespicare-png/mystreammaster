/* Click-driven competition gallery, scoped to this preview. */
(function(){
 const section=document.querySelector('.sm-leagues'); if(!section) return;
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
  button.addEventListener('click',()=>go(Number(button.dataset.index),direction));
  return {button,title,img,image,fallback,direction};
 });
 let selected=-1, directionHint=0;
 function animateSwap(oldIndex,newIndex,direction){
  if(oldIndex<0 || motion.matches)return;
  rail.querySelectorAll('.league-transition-ghost,.league-transition-logo').forEach(el=>el.remove());
  cards.forEach(card=>{card.getAnimations().forEach(a=>a.cancel());card.querySelector('.sm-leagues__image img')?.getAnimations().forEach(a=>a.cancel())});
  neighbours.forEach(({button})=>button.getAnimations().forEach(a=>a.cancel()));
  const incomingSide=neighbours.find(n=>n.direction===direction);
  const outgoingSide=neighbours.find(n=>n.direction===-direction);
  const railRect=rail.getBoundingClientRect(), cardRect=cards[newIndex].getBoundingClientRect();
  const sideRect=incomingSide.button.getBoundingClientRect();
  if(!railRect.width || !sideRect.width)return;
  const centerLogo=cards[newIndex].querySelector('.sm-leagues__image img').getBoundingClientRect();
  const inLogo=incomingSide.img.getBoundingClientRect(),outLogo=outgoingSide.img.getBoundingClientRect();
  const options={duration:1100,easing:'cubic-bezier(.215,.61,.355,1)',fill:'both'};
  const outgoing=cards[oldIndex].cloneNode(true);
  outgoing.hidden=false;outgoing.inert=true;outgoing.setAttribute('aria-hidden','true');
  outgoing.classList.add('league-transition-ghost');outgoing.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  rail.append(outgoing);
  const exit=outgoing.animate([
   {opacity:1,offset:0},
   {opacity:0,offset:.45},
   {opacity:0,offset:1}
  ],options);
  exit.onfinish=()=>outgoing.remove();exit.oncancel=()=>outgoing.remove();
  cards[newIndex].animate([
   {opacity:0,offset:0},
   {opacity:0,offset:.58},
   {opacity:1,offset:1}
  ],options);
  // The reference crossfades the detailed central object and its quieter side image
  // while both travel together. Move the selected emblem as its own visual layer.
  function movingLogo(index,from,to,entering){
   const logo=document.createElement('img');logo.className='league-transition-logo';logo.alt='';logo.setAttribute('aria-hidden','true');
   logo.src=cards[index].querySelector('.sm-leagues__image img').src;
   const fx=from.left+from.width/2-railRect.left,fy=from.top+from.height/2-railRect.top;
   const tx=to.left+to.width/2-railRect.left,ty=to.top+to.height/2-railRect.top;
   const size=Math.max(1,from.width),endScale=Math.max(.1,to.width/size);
   Object.assign(logo.style,{left:(fx-size/2)+'px',top:(fy-size/2)+'px',width:size+'px',height:size+'px'});rail.append(logo);
   const anim=logo.animate([
    {transform:'translate(0,0) scale(1)',opacity:entering?.52:0,offset:0},
    {opacity:entering?.98:.32,offset:.68},
    {transform:`translate(${tx-fx}px,${ty-fy}px) scale(${endScale})`,opacity:entering?0:.52,offset:1}
   ],options);
   anim.onfinish=()=>logo.remove();anim.oncancel=()=>logo.remove();
  }
  if(centerLogo.width&&inLogo.width&&outLogo.width){movingLogo(newIndex,inLogo,centerLogo,true);movingLogo(oldIndex,centerLogo,outLogo,false)}
  incomingSide.button.animate([{opacity:0},{opacity:.52}],options);
  outgoingSide.button.animate([{opacity:0,offset:0},{opacity:0,offset:.65},{opacity:.52,offset:1}],options);
 }

 function transitionStats(){
  if(motion.matches)return;
  const stats=[...section.querySelectorAll('.sm-leagues__stat')];
  stats.forEach(stat=>{
   stat.querySelectorAll('.stat-transition-old').forEach(el=>el.remove());
   [...stat.children].forEach(child=>child.getAnimations().forEach(a=>a.cancel()));
   const old=stat.cloneNode(true);old.classList.add('stat-transition-old');old.setAttribute('aria-hidden','true');old.inert=true;
   stat.append(old);
   const fade=old.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-5px)'}],{duration:200,easing:'ease-in',fill:'forwards'});
   fade.onfinish=()=>old.remove();fade.oncancel=()=>old.remove();
  });
  // The statistics module updates values in a mutation-observer microtask.
  stats.forEach((stat,index)=>[...stat.children].filter(child=>!child.classList.contains('stat-transition-old')).forEach(child=>{
   child.animate([{opacity:0,transform:'translateY(6px)'},{opacity:0,transform:'translateY(6px)',offset:.35},{opacity:1,transform:'translateY(0)'}],{duration:500,delay:index*55,easing:'ease-out'});
  }));
 }

 function select(i){
  i=Math.max(0,Math.min(cards.length-1,i)); if(i===selected)return;
  const oldIndex=selected; const direction=directionHint || (i>selected?1:-1);
  if(oldIndex>=0){
   transitionStats();
   rail.classList.remove('is-switching');void rail.offsetWidth;
   if(!motion.matches)rail.classList.add('is-switching');
  }
  section.style.setProperty('--league-enter-x', i>selected?'24px':'-24px');
  section.style.setProperty('--league-progress', String(i/(cards.length-1))); selected=i;
  cards.forEach((card,n)=>{const on=n===i;card.hidden=!on;card.inert=!on;card.setAttribute('aria-hidden',String(!on));});
  buttons.forEach((button,n)=>{button.setAttribute('aria-pressed',String(n===i));if(n===i)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
  section.style.setProperty('--league-accent',cards[i].dataset.accent);
  // Keep the beige base; only a faint wash uses each existing card's colour.
  const cardColour=cards[i].style.getPropertyValue('--card-bg').match(/#[0-9a-f]{6}/i);
  if(cardColour)section.style.setProperty('--league-ambient',cardColour[0]+'18');
  section.querySelector('.sm-leagues__count').textContent=String(i+1).padStart(2,'0')+' / 08';
  neighbours.forEach(({button,title,img,image,fallback,direction})=>{
   const index=(i+direction+cards.length)%cards.length; button.hidden=index<0||index>=cards.length; button.dataset.index=String(index);
   if(button.hidden)return;
   const card=cards[index], name=card.querySelector('h3').textContent;
   button.style.background=card.style.getPropertyValue('--card-bg');
   button.classList.toggle('is-light',index===3);
   button.setAttribute('aria-label','اختر '+name); title.textContent=name;
   fallback.textContent=card.querySelector('.sm-leagues__image span').textContent;
   image.classList.remove('is-failed');img.src=card.querySelector('img').src;
   if(img.complete&&!img.naturalWidth)image.classList.add('is-failed');
  });
  animateSwap(oldIndex,i,direction);
  const bounds=strip.getBoundingClientRect(), active=buttons[i].getBoundingClientRect();
  // Scroll only the strip itself, never the page. Centering also handles RTL and rapid changes.
  if(strip.scrollWidth>strip.clientWidth){
   const delta=(active.left+active.right-bounds.left-bounds.right)/2;
   strip.scrollTo({left:strip.scrollLeft+delta,behavior:motion.matches?'instant':'smooth'});
  }
 }
 function go(i,direction=0){
  directionHint=direction || (i===selected+1 || (selected===cards.length-1 && i===0)?1:-1);
  select(i);directionHint=0;
 }
 buttons.forEach((button,i)=>button.addEventListener('click',()=>section.classList.contains('sm-leagues--panel-open')?select(i):go(i)));
 window.smLeagueGallery={select,go,getSelected:()=>selected};
 // Horizontal swipes belong to the selector; vertical gestures remain native page scrolling.
 let gesture=null, suppressClick=false;
 rail.addEventListener('pointerdown',event=>{
  if(!event.isPrimary || (event.pointerType==='mouse' && event.button!==0))return;
  const control=event.target.closest('button,a');
  if(control&&!control.classList.contains('sm-leagues__neighbour'))return;
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
 });
 window.addEventListener('pointerup',event=>{
  if(!gesture || event.pointerId!==gesture.id)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;
  if(Math.abs(dx)<55 || Math.abs(dx)<Math.abs(dy)*1.3)return;
  suppressClick=true;setTimeout(()=>{suppressClick=false},500);
  const direction=dx<0?1:-1;
  go((selected+direction+cards.length)%cards.length,direction);
 });
 window.addEventListener('pointercancel',event=>{if(gesture?.id===event.pointerId)gesture=null});
 rail.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false}},true);
 rail.addEventListener('dragstart',event=>event.preventDefault());

 section.querySelectorAll('img').forEach(img=>{const fail=()=>img.closest('.sm-leagues__image')?.classList.add('is-failed');img.addEventListener('error',fail);if(img.complete&&!img.naturalWidth)fail()});
 section.classList.add('is-ready');select(0);
})();
