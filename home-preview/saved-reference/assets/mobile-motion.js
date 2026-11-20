/* Mobile adaptations of the reference's scroll-linked project and closing
   scene. They use native touch scrolling and never move the document sideways. */
(function(){
 const mq=matchMedia('(max-width: 1023px)'),motion=window.smMotion;
 const cards=[...document.querySelectorAll('.sm-servers .project')];
 const visual=document.querySelector('.sm-contact__visual');
 let frame=0,active=false;
 function enabled(){return mq.matches&&!motion.matches}
 function clear(){
  cards.forEach(card=>{card.style.removeProperty('--mobile-project-scale');card.style.removeProperty('--mobile-project-opacity');card.style.removeProperty('--mobile-cta-shift')});
  visual?.style.removeProperty('--mobile-device-shift');
  document.documentElement.classList.remove('sm-mobile-motion');
 }
 function update(){
  frame=0;if(!enabled()||document.hidden){if(active){clear();active=false}return}
  active=true;document.documentElement.classList.add('sm-mobile-motion');
  const height=window.innerHeight||1;
  for(const card of cards){
   const rect=card.getBoundingClientRect();
   if(rect.bottom<0||rect.top>height)continue;
   const center=(rect.top+rect.height/2)/height;
   const distance=Math.min(1,Math.abs(center-.5)*1.15);
   // Keep details readable even at the edges; focus never shrinks its target.
   const factor=card.contains(document.activeElement)?0:distance;
   card.style.setProperty('--mobile-project-scale',(1-.16*factor).toFixed(3));
   card.style.setProperty('--mobile-project-opacity',(1-.22*factor).toFixed(3));
   card.style.setProperty('--mobile-cta-shift',(factor*15).toFixed(1)+'px');
  }
  if(visual){const rect=visual.getBoundingClientRect();if(rect.bottom>=0&&rect.top<=height){const progress=Math.max(-1,Math.min(1,(rect.top+rect.height/2-height/2)/height));visual.style.setProperty('--mobile-device-shift',(-progress*18).toFixed(1)+'px')}}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
 document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);document.addEventListener('visibilitychange',schedule);
 motion.addEventListener('change',schedule);mq.addEventListener?.('change',schedule);schedule();
})();
