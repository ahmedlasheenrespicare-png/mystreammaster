/* Scroll-driven handwritten accents. No continuous animation or layout writes
   when the headings are offscreen or the visitor has stopped scrolling. */
(()=>{
 const motion=window.smMotion;if(!motion)return;
 const pairs=[['.flow-intro','.flow-intro__script'],['.steps-intro__inner','.steps-intro__script'],['.smcin-head','.smcin-script'],['.sm-matches__title','.sm-matches__script']].map(([heading,accent])=>({heading:document.querySelector(heading),accent:document.querySelector(accent),visible:false,last:NaN})).filter(p=>p.heading&&p.accent);
 if(!pairs.length)return;
 let frame=0;
 function update(){
  frame=0;if(document.hidden||motion.matches)return;
  const viewport=innerHeight||1;
  for(const p of pairs){if(!p.visible)continue;const r=p.heading.getBoundingClientRect();const progress=Math.max(-1,Math.min(1,(viewport/2-(r.top+r.height/2))/(viewport*.7)));const y=Math.round(progress*Math.min(110,r.height*.24)*10)/10;if(y!==p.last){p.accent.style.setProperty('--sm-accent-y',`${y}px`);p.last=y}}
 }
 function schedule(){if(!frame&&!document.hidden&&!motion.matches&&pairs.some(p=>p.visible))frame=requestAnimationFrame(update)}
 function sync(){if(frame){cancelAnimationFrame(frame);frame=0}if(motion.matches){for(const p of pairs){p.accent.style.removeProperty('--sm-accent-y');p.last=NaN}}else schedule()}
 if('IntersectionObserver' in window){const byHeading=new Map(pairs.map(p=>[p.heading,p]));const observer=new IntersectionObserver(entries=>{for(const e of entries){const p=byHeading.get(e.target);if(p)p.visible=e.isIntersecting}if(!pairs.some(p=>p.visible)&&frame){cancelAnimationFrame(frame);frame=0}schedule()},{rootMargin:'100px'});pairs.forEach(p=>observer.observe(p.heading))}else pairs.forEach(p=>p.visible=true);
 addEventListener('scroll',schedule,{passive:true});addEventListener('sm-smooth-scroll',schedule);addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);schedule();
})();
