/* Reveal whole Arabic lines and gently follow the scroll without breaking
   connected letterforms. The heading stays readable when motion is off. */
(function(){
 const lines=[...document.querySelectorAll('.sm-hero-copy .sm-hero-line')];
 if(!lines.length)return;
 const seen=new WeakSet();let frame=0;
 const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  entries.forEach(({target,isIntersecting})=>{
   if(isIntersecting){seen.add(target);target.classList.remove('sm-hero-pending');observer.unobserve(target)}
  });
 },{threshold:.15}):null;
 function update(){
  frame=0;
  if(window.smMotion.matches||document.hidden){lines.forEach(line=>line.style.removeProperty('--hero-drift'));return}
  const height=window.innerHeight||1;
  lines.forEach(line=>{
   const rect=line.getBoundingClientRect();
   if(rect.bottom<0||rect.top>height){line.style.removeProperty('--hero-drift');return}
   const center=(rect.top+rect.height/2)/height;
   line.style.setProperty('--hero-drift',`${Math.max(-9,Math.min(9,(center-.5)*18)).toFixed(1)}px`);
  });
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 function sync(){
  lines.forEach(line=>{
   if(window.smMotion.matches||seen.has(line)||!observer)line.classList.remove('sm-hero-pending');
   else line.classList.add('sm-hero-pending');
  });
  schedule();
 }
 sync();if(observer)lines.forEach(line=>observer.observe(line));
 window.smMotion.addEventListener('change',sync);
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
 document.addEventListener('visibilitychange',schedule);

 // The same three verbs used by the live homepage, only while in view.
 const verb=document.querySelector('.sm-hero-verb'),words=['شاهِد','تابِع','اكتشِف'];
 if(!verb)return;
 let visible=!observer,index=0,timer=0,swap=0;
 function stop(){clearTimeout(timer);clearTimeout(swap);timer=swap=0;verb.classList.remove('is-changing')}
 function tick(){
  if(!visible||document.hidden||window.smMotion.matches)return;
  timer=setTimeout(()=>{
   verb.classList.add('is-changing');
   swap=setTimeout(()=>{index=(index+1)%words.length;verb.textContent=words[index];verb.classList.remove('is-changing');tick()},300);
  },5000);
 }
 function syncVerb(){stop();if(window.smMotion.matches){index=0;verb.textContent=words[0]}else tick()}
 if(observer)new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);syncVerb()},{threshold:.15}).observe(verb);
 window.smMotion.addEventListener('change',syncVerb);document.addEventListener('visibilitychange',syncVerb);syncVerb();
})();
