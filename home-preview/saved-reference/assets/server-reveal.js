/* Reveal each complete project as it enters view, on phones and desktops. */
(function(){
 const cards=[...document.querySelectorAll('.sm-servers .sm-server')];
 if(!('IntersectionObserver' in window))return;
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}
 }),{threshold:.12});
 cards.forEach(card=>observer.observe(card));
})();

/* Follow the section like the reference's pinned backdrop, in either scroll
   direction. Read the visual rect so it also follows the smoothed desktop and
   touch scrollers; run frames only while the section is on screen. */
(function(){
 const section=document.querySelector('.sm-servers'),label=section?.querySelector('.float'),motion=window.smMotion;
 if(!section||!label||!motion)return;
 let visible=false,frame=0,last=NaN,metrics=null;
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;last=NaN;label.style.removeProperty('transform')}
 function update(){
  frame=0;if(!visible||document.hidden||motion.matches){stop();return}
  const rect=section.getBoundingClientRect(),height=window.innerHeight||1;
  if(!metrics)metrics={top:parseFloat(getComputedStyle(label).top)||0,height:label.offsetHeight};
  const top=metrics.top,labelHeight=metrics.height;
  const start=height*.12,travel=Math.max(0,rect.height-top-labelHeight),pin=Math.max(0,start-rect.top-top);
  const progress=Math.max(0,Math.min(1,(height-rect.top)/(rect.height+height)));
  const offset=Math.min(travel,pin+labelHeight*.74*progress),rounded=Math.round(offset*10)/10;
  if(rounded!==last){label.style.transform=`translate3d(0, ${rounded}px, 0)`;last=rounded}
  frame=requestAnimationFrame(update);
 }
 function sync(){if(!visible||document.hidden||motion.matches)stop();else if(!frame)frame=requestAnimationFrame(update)}
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync()}).observe(section);
 else {visible=true;sync()}
 motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);window.addEventListener('resize',()=>{metrics=null;sync()},{passive:true});
 document.fonts?.ready.then(()=>{metrics=null;sync()});
})();
