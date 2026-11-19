/* Scroll-linked wordmark: reversible, and idle away from the contact scene. */
(function(){
 const scene=document.querySelector('.sm-contact .sm-footer__cta');
 const brand=scene?.querySelector('.footer-background-brand');
 if(!scene||!brand)return;
 let near=false,frame=0;
 function update(){
  frame=0;
  if(window.smMotion?.matches){brand.style.removeProperty('--brand-rise');brand.style.removeProperty('--brand-opacity');return}
  const top=scene.getBoundingClientRect().top;
  const progress=Math.max(0,Math.min(1,(innerHeight*.9-top)/(innerHeight*.45)));
  const eased=1-Math.pow(1-progress,3);
  brand.style.setProperty('--brand-rise',`${((1-eased)*70).toFixed(2)}px`);
  brand.style.setProperty('--brand-opacity',(0.15+0.85*eased).toFixed(3));
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 function onScroll(){if(near&&!document.hidden)schedule()}
 if('IntersectionObserver' in window){
  new IntersectionObserver(entries=>{near=entries[0].isIntersecting;schedule()},{rootMargin:'100px'}).observe(scene);
 }else{near=true}
 window.addEventListener('scroll',onScroll,{passive:true});
 window.addEventListener('sm-smooth-scroll',onScroll,{passive:true});
 window.addEventListener('resize',schedule,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 window.smMotion?.addEventListener('change',schedule);
 schedule();
})();
