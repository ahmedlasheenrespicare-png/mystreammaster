/* Scroll pose inspired by Advanced Team's showreel: entry from depth,
   rotation grows with scroll, and the same timeline reverses on the way up. */
(function(){
 const scene=document.querySelector('.about-ribbons-scene'),strip=scene?.querySelector('.rose-strip'),layer=scene?.querySelector('.rose-strip__perspective');
 if(!scene||!strip||!layer)return;
 // Load background copies only as cards approach the viewport.
 const cards=strip.querySelectorAll('.rose-strip__card');
 function prepareBackground(card){const img=card.querySelector('img');if(img?.src)card.style.setProperty('--poster-background',`url(${JSON.stringify(img.src)})`)}
 if('IntersectionObserver'in window){const cardObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){prepareBackground(entry.target);cardObserver.unobserve(entry.target)}}),{rootMargin:'200px'});cards.forEach(card=>cardObserver.observe(card))}else cards.forEach(prepareBackground);
 let near=!('IntersectionObserver'in window),raf=0,current=null,last=0;
 const reduced=()=>!!window.smMotion?.matches;
 const clamp=x=>Math.max(0,Math.min(1,x));
 function pose(progress){
  const p=clamp(progress),ease=1-Math.pow(1-p,2);
  layer.style.setProperty('--reel-angle',`${(-9*p).toFixed(3)}deg`);
  layer.style.setProperty('--reel-y',`${((.5-p)*Math.min(innerHeight*.30,230)).toFixed(2)}px`);
  const depth=innerWidth<=700?18:24;
  layer.style.setProperty('--reel-depth',`${(depth+32*(1-ease)).toFixed(3)}deg`);
  layer.style.setProperty('--reel-opacity',`${(.16+.84*Math.min(1,p*3)).toFixed(3)}`);
  scene.dataset.reelProgress=p.toFixed(3);
 }
 function target(){const rect=scene.getBoundingClientRect();return clamp((innerHeight*.9-rect.top)/(rect.height+innerHeight*.4))}
 function tick(now){
  raf=0;if(document.hidden||reduced()||!near){last=0;return}
  const goal=target();if(current===null)current=goal;
  const dt=last?Math.min(50,now-last):16;last=now;
  current+=(goal-current)*(1-Math.exp(-dt/115));
  if(Math.abs(goal-current)<.0005){current=goal;last=0}
  pose(current);
  if(last)raf=requestAnimationFrame(tick);
 }
 function schedule(){if(near&&!document.hidden&&!reduced()&&!raf)raf=requestAnimationFrame(tick)}
 function sync(){if(reduced()){if(raf)cancelAnimationFrame(raf);raf=0;current=null;last=0;scene.removeAttribute('data-reel-progress');return}schedule()}
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>{near=entries[0].isIntersecting;if(!near){if(raf)cancelAnimationFrame(raf);raf=0;last=0}else schedule()},{rootMargin:'100px'}).observe(scene);
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('sm-smooth-scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',sync);window.smMotion?.addEventListener('change',sync);schedule();
})();
