/* Path-card fan: one reveal, scroll-driven desktop placement, touch-native mobile. */
(()=>{
 const section=document.querySelector('#path-section'),fan=section?.querySelector('.sm-fan'),motion=window.smMotion;
 if(!fan||!motion)return;
 const wraps=[...fan.querySelectorAll('.sm-fan-wrap')],dots=[...section.querySelectorAll('.sm-fan-dots span')],mobile=matchMedia('(max-width:1023px)');
 if(wraps.length!==3)return;
 let frame=0,visible=false,revealed=false,centred=false;
 function centreOnce(){if(centred||!mobile.matches)return;const target=wraps[1],box=fan.getBoundingClientRect(),r=target.getBoundingClientRect();fan.scrollLeft+=(r.left+r.width/2)-(box.left+box.width/2);centred=true}
 centreOnce();
 document.documentElement.classList.add('sm-fan-motion');
 function paint(){
  frame=0;if(!visible||document.hidden)return;centreOnce();const r=fan.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)));
  if(!mobile.matches&&!motion.matches){const x=Math.max(0,30*(1-2*p)),y=30*(1-p);wraps[0].style.setProperty('--wrap-x',-x+'%');wraps[0].style.setProperty('--wrap-y',y+'px');wraps[1].style.setProperty('--wrap-y',(15-20*p)+'%');wraps[2].style.setProperty('--wrap-x',x+'%');wraps[2].style.setProperty('--wrap-y',y+'px')}
  if(!revealed&&r.top<innerHeight*.7){revealed=true;fan.classList.add('is-revealed')}
  if(mobile.matches){const mid=r.left+fan.clientWidth/2;let best=0,dist=Infinity;wraps.forEach((e,i)=>{const v=e.getBoundingClientRect(),d=Math.abs(v.left+v.width/2-mid);if(d<dist){dist=d;best=i}});dots.forEach((d,i)=>d.classList.toggle('active',i===best));fan.dataset.active=String(best)}
 }
 function schedule(){if(visible&&!document.hidden&&!frame)frame=requestAnimationFrame(paint)}
 if('IntersectionObserver'in window)new IntersectionObserver(es=>{visible=es.some(e=>e.isIntersecting);if(!visible&&frame){cancelAnimationFrame(frame);frame=0}schedule()},{rootMargin:'100px'}).observe(fan);else visible=true;
 addEventListener('scroll',schedule,{passive:true});addEventListener('sm-smooth-scroll',schedule);addEventListener('resize',schedule,{passive:true});fan.addEventListener('scroll',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);
 mobile.addEventListener('change',()=>{if(mobile.matches)centred=false;schedule()});motion.addEventListener('change',()=>{if(motion.matches){revealed=true;fan.classList.add('is-revealed')}schedule()});
 if(motion.matches){revealed=true;fan.classList.add('is-revealed')}
 function go(delta){const i=Math.max(0,Math.min(2,Number(fan.dataset.active||0)+delta));wraps[i].scrollIntoView({behavior:motion.matches?'auto':'smooth',block:'nearest',inline:'center'})}
 section.querySelector('.sm-fan-prev')?.addEventListener('click',()=>go(-1));section.querySelector('.sm-fan-next')?.addEventListener('click',()=>go(1));
 // Focus should never leave a keyboard user behind the unrevealed stack.
 fan.addEventListener('focusin',()=>{if(!revealed){revealed=true;fan.classList.add('is-revealed')}});
 schedule();
})();
