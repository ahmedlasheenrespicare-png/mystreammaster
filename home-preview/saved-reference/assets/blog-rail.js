/* Reference-inspired drift pauses for reading and direct input. Mobile opts in
   through the site motion setting; reduced motion is always respected. */
(function(){
 const section=document.querySelector('.sm-blog');if(!section)return;
 const rail=section.querySelector('.sm-blog__rail'),previous=section.querySelector('[data-blog-direction="previous"]'),next=section.querySelector('[data-blog-direction="next"]'),toggle=section.querySelector('.sm-blog__motion');
 const reduce=window.smMotion,desktop=matchMedia('(min-width: 1024px)');
 let enabled=true,visible=false,hover=false,focused=false,frame=0,last=0,position=0,direction=1;
 function update(){const span=Math.max(0,rail.scrollWidth-rail.clientWidth),offset=Math.max(0,Math.min(span,-rail.scrollLeft));section.style.setProperty('--blog-progress',span?String(offset/span):'0');previous.disabled=offset<=1;next.disabled=offset>=span-1}
 function motionAllowed(){return desktop.matches||document.documentElement.dataset.motion==='on'}
 function canRun(){return enabled&&visible&&!hover&&!focused&&!document.hidden&&!reduce.matches&&motionAllowed()&&rail.scrollWidth>rail.clientWidth}
 function tick(now){frame=0;if(!canRun()){last=0;rail.classList.remove('is-auto');return}const span=rail.scrollWidth-rail.clientWidth;rail.classList.add('is-auto');if(!last){last=now;position=Math.max(0,-rail.scrollLeft)}else{position+=Math.min(now-last,50)*.035*direction;last=now;if(position>=span){position=span;direction=-1}else if(position<=0){position=0;direction=1}rail.scrollLeft=-position}update();frame=requestAnimationFrame(tick)}
 function schedule(){toggle.hidden=reduce.matches||!motionAllowed();toggle.textContent=enabled?'إيقاف الحركة':'تشغيل الحركة';toggle.setAttribute('aria-pressed',String(enabled));if(!canRun()){last=0;rail.classList.remove('is-auto');if(frame){cancelAnimationFrame(frame);frame=0}}else if(!frame)frame=requestAnimationFrame(tick)}
 function step(delta){enabled=false;schedule();const card=rail.querySelector('.sm-blog__card');if(!card)return;const distance=card.getBoundingClientRect().width+(parseFloat(getComputedStyle(rail).gap)||0);rail.scrollBy({left:delta*distance,behavior:reduce.matches?'auto':'smooth'})}
 previous.addEventListener('click',()=>step(1));next.addEventListener('click',()=>step(-1));
 toggle.addEventListener('click',()=>{enabled=!enabled;schedule()});
 section.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&matchMedia('(hover:hover)').matches){hover=true;schedule()}});section.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){hover=false;schedule()}});
 section.addEventListener('focusin',()=>{focused=true;schedule()});section.addEventListener('focusout',e=>{if(!section.contains(e.relatedTarget)){focused=false;schedule()}});
 rail.addEventListener('touchstart',()=>{enabled=false;schedule()},{passive:true});rail.addEventListener('wheel',()=>{enabled=false;schedule()},{passive:true});
 rail.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',()=>{update();schedule()});document.addEventListener('visibilitychange',schedule);reduce.addEventListener?.('change',schedule);desktop.addEventListener?.('change',schedule);
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);schedule()},{threshold:.1}).observe(section);else visible=true;
 update();schedule();
 if(location.hash==='#blog-teaser'){
  let moved=false;const cancel=()=>{moved=true};
  window.addEventListener('wheel',cancel,{once:true,passive:true});window.addEventListener('touchstart',cancel,{once:true,passive:true});
  const restore=()=>setTimeout(()=>{if(!moved)window.scrollTo({top:window.scrollY+section.getBoundingClientRect().top,behavior:'auto'})},1800);
  if(document.readyState==='complete')restore();else window.addEventListener('load',restore,{once:true});
 }
})();
