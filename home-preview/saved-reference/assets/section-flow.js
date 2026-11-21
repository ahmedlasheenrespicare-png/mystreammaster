/* Stagger section content according to scroll position.
   Measurements are taken from the stationary parent, not moving children. */
(()=>{
 const specs=[
  {anchor:'.about-ribbons-scene .abt__top__text',direction:'up',items:[':scope > p:first-child',':scope > .sm-about__welcome',':scope > p:last-child']},
  {anchor:'#supported-devices',items:[{selector:'.sm-device--tv',direction:'right'},{selector:'.sm-device--phone',direction:'up'},{selector:'.sm-device--laptop',direction:'left'}]},
  {anchor:'#services .sm-sports__titles',direction:'down',items:['.sm-sports__heading > span:nth-child(1)','.sm-sports__heading > span:nth-child(2)','.sm-sports__heading > span:nth-child(3)','.sm-sports__marks']},
  {anchor:'#league-strip .sm-leagues__top',direction:'right',items:['h2','p']},
  {anchor:'#featured-matches .sm-matches__header',items:[{selector:'.sm-matches__title',direction:'up'},{selector:'.sm-matches__stadium',direction:'left'},{selector:'.sm-matches__aside',direction:'up'}]},
  {anchor:'#cinema-library .smcin-head',direction:'up',items:['.smcin-kicker','h2','.smcin-aster']},
  {anchor:'#path-section .sm-path__heading',direction:'right',items:['.sm-path__eyebrow','h2','.sm-path__meta']},
  {anchor:'#works .flow-intro',direction:'up',items:['h2','.flow-intro__meta','p']},
  {anchor:'#journey .steps-intro__inner',direction:'left',items:['h2','p']},
  {anchor:'#reviews .sm-reviews__head',direction:'up',items:['h2']},
  {anchor:'#faq .sm-faq__heading',direction:'down',items:['.sm-faq__eyebrow','h2','.sm-faq__intro']},
  {anchor:'#blog-teaser .sm-blog__title',direction:'right',items:['.sm-blog__eyebrow','h2','.sm-blog__intro']},
  {anchor:'.sm-footer .sm-footer__main',direction:'up',items:['.sm-footer__brand','.sm-footer__nav']}
 ];
 const groups=specs.map(spec=>{const anchor=document.querySelector(spec.anchor);if(!anchor)return null;const items=spec.items.map(item=>{const def=typeof item==='string'?{selector:item,direction:spec.direction}:item;const el=anchor.querySelector(def.selector);return el?{el,direction:def.direction,large:el.matches('h2, .sm-matches__title, .sm-matches__stadium, .sm-sports__heading > span, .sm-about__welcome')}:null}).filter(Boolean);return {anchor,items,near:true}}).filter(Boolean);
 const clamp=n=>Math.max(0,Math.min(1,n));
 // Match the league overlay's cubic-bezier(.76,0,.24,1).
 function ease(value){let lo=0,hi=1,t=value;for(let i=0;i<14;i++){t=(lo+hi)/2;const x=3*(1-t)*(1-t)*t*.76+3*(1-t)*t*t*.24+t*t*t;if(x<value)lo=t;else hi=t}return 3*(1-t)*t*t+t*t*t}const reduced=()=>window.smMotion?.matches??matchMedia('(prefers-reduced-motion: reduce)').matches;let frame=0;
 // Interpolate once per frame instead of restarting CSS transitions on every
 // scroll event. Keep the original paths, stagger and easing intact.
 let lastTime = 0;
 const states = new WeakMap();
 function reset(){
  lastTime=0;
  for(const group of groups){group.anchor.removeAttribute('data-flow-overall');for(const item of group.items){states.delete(item.el);item.el.style.removeProperty('--entry-x');item.el.style.removeProperty('--entry-y');item.el.style.removeProperty('--entry-opacity');item.el.style.removeProperty('--entry-rotate');item.el.removeAttribute('data-flow-progress')}}
 }
 function sectionOffset(anchor){
  const section=anchor.closest('.sm-section-motion');
  if(!section)return 0;
  const value=getComputedStyle(section).translate;
  const parts=value==='none'?[]:value.split(/\s+/);
  return parts.length>1?parseFloat(parts[1])||0:0;
 }
 function draw(now){
  frame=0;
  if(document.hidden||reduced()){lastTime=0;return}
  const alpha=1-Math.exp(-Math.min(lastTime?now-lastTime:16,50)/210);
  lastTime=now;
  // Read all geometry before changing styles, avoiding layout thrashing.
  const visible=groups.filter(group=>group.near).map(group=>{
   const r=group.anchor.getBoundingClientRect(),offset=sectionOffset(group.anchor);
   return {group,top:r.top-offset,bottom:r.bottom-offset};
  });
  let moving=false;
  for(const {group,top,bottom} of visible){
   const overall=Math.min(clamp((innerHeight+Math.min(innerHeight*.12,180)-top)/(innerHeight*.84)),clamp(bottom/(innerHeight*.18)));
   group.anchor.dataset.flowOverall=overall.toFixed(3);
   group.items.forEach((item,index)=>{
    const duration=1+Math.max(0,group.items.length-1)*.04,start=index*.04/duration,end=(index*.04+1)/duration,progress=clamp((overall-start)/(end-start)),eased=progress===0?0:progress===1?1:ease(progress),amount=1-eased-(item.large?.025:.055)*Math.sin(Math.PI*clamp((progress-.55)/.45));
    const direction=item.direction||'right',horizontal=Math.min(innerWidth*.75,500),vertical=Math.min(innerHeight*.35,280);
    const target={x:(direction==='right'?horizontal:direction==='left'?-horizontal:0)*amount,y:(direction==='up'?vertical:direction==='down'?-vertical:0)*amount,rotate:(direction==='left'||direction==='down'?-3:3)*amount};
    let state=states.get(item.el);
    if(!state){state={...target};states.set(item.el,state)}
    for(const key of ['x','y','rotate']){
     const delta=target[key]-state[key];
     if(Math.abs(delta)<.015)state[key]=target[key];
     else {state[key]+=delta*alpha;moving=true}
    }
    item.el.style.setProperty('--entry-x',`${state.x.toFixed(2)}px`);
    item.el.style.setProperty('--entry-y',`${state.y.toFixed(2)}px`);
    item.el.style.setProperty('--entry-rotate',`${state.rotate.toFixed(3)}deg`);
    item.el.style.setProperty('--entry-opacity',eased.toFixed(3));
    item.el.dataset.flowProgress=progress.toFixed(3);
   });
  }
  if(moving)frame=requestAnimationFrame(draw);else lastTime=0;
 }
 function schedule(){if(!frame&&!document.hidden&&!reduced())frame=requestAnimationFrame(draw)}
 groups.forEach(group=>group.items.forEach(item=>item.el.classList.add('flow-entry')));
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){const group=groups.find(g=>g.anchor===entry.target);if(group)group.near=entry.isIntersecting}schedule()},{rootMargin:'300px',threshold:[0,.1,.3,.6,1]});groups.forEach(group=>observer.observe(group.anchor))}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('sm-smooth-scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);window.smMotion?.addEventListener('change',()=>{if(reduced()){if(frame)cancelAnimationFrame(frame);frame=0;reset()}else schedule()});schedule();
})();
