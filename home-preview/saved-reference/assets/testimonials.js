/* The review timer only runs while the carousel is visible and motion is enabled. */
(()=>{
 const root=document.querySelector('#reviews');if(!root)return;
 const carousel=root.querySelector('.sm-reviews__carousel'),cards=[...root.querySelectorAll('.sm-reviews__card')],dots=[...root.querySelectorAll('.sm-reviews__dot')],controls=root.querySelector('.sm-reviews__controls');
 if(!carousel||!cards.length||dots.length!==cards.length||!controls)return;
 let index=0,timer=0,near=!('IntersectionObserver'in window),paused=false;
 const motionOff=()=>window.smMotion?.matches??matchMedia('(prefers-reduced-motion: reduce)').matches;
 function show(next){index=(next+cards.length)%cards.length;cards.forEach((card,i)=>{card.hidden=i!==index;dots[i].setAttribute('aria-current',String(i===index))})}
 function sync(){clearInterval(timer);timer=0;if(near&&!paused&&!document.hidden&&!motionOff())timer=setInterval(()=>show(index+1),5500)}
 root.querySelector('[data-review-next]').addEventListener('click',()=>{show(index+1);sync()});root.querySelector('[data-review-prev]').addEventListener('click',()=>{show(index-1);sync()});dots.forEach((dot,i)=>dot.addEventListener('click',()=>{show(i);sync()}));
 carousel.addEventListener('mouseenter',()=>{paused=true;sync()});carousel.addEventListener('mouseleave',()=>{paused=false;sync()});carousel.addEventListener('focusin',()=>{paused=true;sync()});carousel.addEventListener('focusout',e=>{if(!carousel.contains(e.relatedTarget)){paused=false;sync()}});
 document.addEventListener('visibilitychange',sync);window.smMotion?.addEventListener('change',sync);
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>{near=entries[0].isIntersecting;sync()},{threshold:.1}).observe(carousel);
 controls.hidden=false;sync();
})();
