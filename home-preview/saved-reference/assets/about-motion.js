/* Reveal the reference's editorial copy and portrait without splitting Arabic
   words. Everything is visible without JS or when motion is disabled. */
(function(){
 const items=[...document.querySelectorAll('.sm-about .abt__who .a-text, .sm-about .abt__who .sm-about__devices')];
 if(!items.length||!('IntersectionObserver' in window))return;
 const seen=new WeakSet();
 const observer=new IntersectionObserver(entries=>{
  entries.forEach(({target,isIntersecting})=>{
   if(isIntersecting){seen.add(target);target.classList.remove('sm-about-reveal-pending');observer.unobserve(target)}
  });
 },{threshold:.12});
 function sync(){items.forEach(item=>item.classList.toggle('sm-about-reveal-pending',!window.smMotion.matches&&!seen.has(item)))}
 sync();items.forEach(item=>observer.observe(item));
 window.smMotion.addEventListener('change',sync);
})();

/* Assemble on first view; pause the ongoing glow while outside the viewport. */
(function(){
 const mark=document.querySelector('.sm-about__welcome');
 if(!mark || !('IntersectionObserver' in window))return;
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  mark.classList.toggle('is-in-view',entry.isIntersecting);
  if(entry.isIntersecting)mark.classList.add('is-visible');
 }),{threshold:.2});
 observer.observe(mark);
})();

/* The journey's editorial paragraph reveals as one unit, never as split Arabic letters. */
(function(){
 const text=document.querySelector('.sm-journey__headline');
 if(!text||!('IntersectionObserver' in window))return;
 let seen=false;
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){seen=true;text.classList.remove('sm-journey-pending');observer.disconnect()}},{threshold:.12});
 function sync(){text.classList.toggle('sm-journey-pending',!seen&&!window.smMotion.matches)}
 sync();observer.observe(text);window.smMotion.addEventListener('change',sync);
})();

/* Reveal the headline as complete Arabic words, like the path title. */
(function(){
 const heading=document.querySelector('.sm-journey__heading');
 if(!heading||!('IntersectionObserver' in window))return;
 let seen=false;
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){seen=true;heading.classList.remove('sm-journey-heading-pending');observer.disconnect()}},{threshold:.12});
 function sync(){heading.classList.toggle('sm-journey-heading-pending',!seen&&!window.smMotion.matches)}
 sync();observer.observe(heading);window.smMotion.addEventListener('change',sync);
})();

/* Pin the compact card stage through the reference smoother and native touch
   scrolling. The text remains in normal flow if motion is disabled or the
   viewport is too short to fit the stage. */
(function(){
 const stage=document.querySelector('.sm-journey__stage'),view=stage?.querySelector('.sm-journey__stage-view'),content=stage?.querySelector('.sm-journey__stage-content'),ghost=stage?.querySelector('.sm-journey__script'),motion=window.smMotion;
 const cards=[...(stage?.querySelectorAll('.sm-journey__steps li')||[])],progressBar=stage?.querySelector('.sm-journey__meter'),progressNumber=stage?.querySelector('[data-journey-progress]');
 if(!stage||!view||!content||!ghost||!progressBar||!progressNumber||!motion||cards.length!==4)return;
 let visible=false,frame=0,wakeTimer=0,active=false,lastY=NaN,lastProgress=-1,centres=null,ghostY=NaN,ghostTime=0,lastGhost='',lastPath='';
 const touchQuery=matchMedia('(max-width: 1023px) and (pointer: coarse)'),nativeTouch=()=>touchQuery.matches;
 let lastInteraction=performance.now(),previewStep=null,nextPreview=0,pinned=false;
 const idleDelay=2500,stepDuration=3000;
 function interrupt(){previewStep=null;nextPreview=0;lastInteraction=performance.now()}
 function startPreview(){previewStep=0;nextPreview=performance.now()+stepDuration}
 function reset(){
  if(frame)cancelAnimationFrame(frame);clearTimeout(wakeTimer);wakeTimer=0;frame=0;active=false;lastY=NaN;lastProgress=-1;centres=null;lastGhost='';lastPath='';
  delete stage.dataset.scrollActive;interrupt();pinned=false;view.style.removeProperty('transform');ghost.style.removeProperty('--journey-ghost-y');progressBar.style.removeProperty('--journey-progress');progressBar.setAttribute('aria-valuenow','1');progressBar.setAttribute('aria-valuetext','الخطوة ١ من ٤');progressNumber.textContent='١';ghostY=NaN;ghostTime=0;cards.forEach(card=>{delete card.dataset.revealed;delete card.dataset.current;card.querySelector('.sm-journey__step-link')?.removeAttribute('tabindex')});
 }
 function update(){
  frame=0;if(!active||motion.matches||document.hidden||!visible)return;
  const rect=stage.getBoundingClientRect(),height=view.offsetHeight,travel=Math.max(1,rect.height-height);
  const shift=Math.max(0,Math.min(travel,-rect.top)),progress=shift/travel;
  const y=Math.round(shift*10)/10,now=performance.now();
  if(Number.isFinite(lastY)&&Math.abs(y-lastY)>.5)interrupt();
  if(y!==lastY){view.style.transform=`translate3d(0,${y}px,0)`;lastY=y}
  pinned=shift>1&&shift<travel-1;
  if(!pinned){if(previewStep!==null)interrupt();lastInteraction=now}
  else if(previewStep===null&&!stage.contains(document.activeElement)&&now-lastInteraction>=idleDelay)startPreview();
  if(stage.contains(document.activeElement)&&previewStep!==null)nextPreview=now+stepDuration;
  if(pinned&&previewStep!==null&&!stage.contains(document.activeElement)&&now>=nextPreview){previewStep=(previewStep+1)%cards.length;nextPreview=now+stepDuration}
  const scrollState=progress>=.72?3:progress>=.48?2:progress>=.24?1:0;
  const state=previewStep===null?scrollState:previewStep;
  if(state!==lastProgress){cards.forEach((card,index)=>{card.dataset.revealed=String(index<=state);card.dataset.current=String(index===state);const link=card.querySelector('.sm-journey__step-link');if(link)link.tabIndex=index===state?0:-1});const digit=['١','٢','٣','٤'][state];progressNumber.textContent=digit;progressBar.setAttribute('aria-valuenow',String(state+1));progressBar.setAttribute('aria-valuetext',`الخطوة ${digit} من ٤`);progressBar.style.setProperty('--journey-progress',`${(state+1)*100/cards.length}%`);lastProgress=state}
  if(!centres){const list=stage.querySelector('.sm-journey__steps');centres=cards.map(card=>list.offsetTop+card.offsetTop+card.offsetHeight/2)}
  const target=centres[state],elapsed=ghostTime?Math.min(now-ghostTime,50):16.67;ghostTime=now;
  ghostY=Number.isFinite(ghostY)?ghostY+(target-ghostY)*(1-Math.exp(-elapsed/180)):target;
  const renderedGhost=ghostY.toFixed(1)+'px';if(renderedGhost!==lastGhost){ghost.style.setProperty('--journey-ghost-y',renderedGhost);lastGhost=renderedGhost}
  if(pointerPath&&stage.dataset.pointer&&stage.dataset.pointer!=='none'){
   const v=view.getBoundingClientRect(),n=progressBar.querySelector('span').getBoundingClientRect(),c=cards[state].getBoundingClientRect();
   const sx=n.right-v.left+4,sy=n.top-v.top+n.height/2,edge=Math.min(v.width-5,c.right-v.left+8),ey=c.top-v.top+c.height/2,ex=Math.min(v.width-5,c.right-v.left+1);
   const path=stage.dataset.pointer==='curve'?`M ${sx} ${sy} Q ${edge} ${sy} ${edge} ${sy+Math.min(22,(ey-sy)/2)} L ${edge} ${ey-6} Q ${edge} ${ey} ${ex} ${ey}`:`M ${sx} ${sy} H ${edge} V ${ey} H ${ex}`;if(path!==lastPath){pointerPath.setAttribute('d',path);lastPath=path}
  }
  if(!nativeTouch()){frame=requestAnimationFrame(update);return}
  // On native touch scrolling, wake on movement or an idle-preview deadline;
  // keep frames running only while the handwritten accent is settling.
  clearTimeout(wakeTimer);wakeTimer=0;
  if(Math.abs(target-ghostY)>.15)frame=requestAnimationFrame(update);
  if(pinned&&!stage.contains(document.activeElement)){
   const due=previewStep===null?lastInteraction+idleDelay:nextPreview;
   wakeTimer=setTimeout(sync,Math.max(16,due-now));
  }
 }
 function sync(){if(!active||motion.matches||document.hidden||!visible){if(frame)cancelAnimationFrame(frame);frame=0;clearTimeout(wakeTimer);wakeTimer=0;if(document.hidden||!visible)interrupt();return}if(!frame)frame=requestAnimationFrame(update)}
 function configure(){
  reset();if(motion.matches)return;
  stage.dataset.scrollActive='true';
  /* Very short displays fall back to ordinary flow rather than clipping cards. */
  const style=getComputedStyle(view),needed=content.scrollHeight+(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0);
  if(needed>window.innerHeight+1){delete stage.dataset.scrollActive;return}
  active=true;cards.forEach((card,index)=>{card.dataset.revealed=String(index===0);card.dataset.current=String(index===0);const link=card.querySelector('.sm-journey__step-link');if(link)link.tabIndex=index===0?0:-1});sync();
 }
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);stage.dataset.inView=String(visible);sync()},{rootMargin:'100px'}).observe(stage);else {visible=true;stage.dataset.inView='true'}
 window.addEventListener('resize',configure,{passive:true});document.fonts?.ready.then(configure);
 function interact(event){if(active&&visible&&pinned){if(event?.target instanceof Element&&event.target.closest('.sm-journey__step-link'))return;interrupt();if(nativeTouch())sync()}}
 document.addEventListener('wheel',interact,{passive:true});document.addEventListener('touchstart',interact,{passive:true});document.addEventListener('pointerdown',interact,{passive:true});
 stage.addEventListener('focusin',()=>{lastInteraction=performance.now();if(nativeTouch())sync()});stage.addEventListener('focusout',()=>{lastInteraction=performance.now();if(nativeTouch())sync()});
 window.addEventListener('scroll',()=>{if(nativeTouch())sync()},{passive:true});
 document.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))interact()});
 const pointerPath=stage.querySelector('.sm-journey__pointer-path');
 touchQuery.addEventListener?.('change',sync);motion.addEventListener('change',configure);document.addEventListener('visibilitychange',sync);configure();
})();
