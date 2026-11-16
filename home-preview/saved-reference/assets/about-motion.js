/* Reveal the reference's editorial copy and portrait without splitting Arabic
   words. Everything is visible without JS or when motion is disabled. */
(function(){
 const items=[...document.querySelectorAll('.sm-about .abt__who .a-text, .sm-about .abt__who .sm-about__devices')];
 if(!items.length||!('IntersectionObserver' in window))return;
 const seen=new WeakSet();
 const observer=new IntersectionObserver(entries=>{
  entries.forEach(({target,isIntersecting})=>{
   if(isIntersecting){seen.add(target);target.classList.remove('sm-about-reveal-pending');observer.unobserve(target)}
  });
 },{threshold:.12});
 function sync(){items.forEach(item=>item.classList.toggle('sm-about-reveal-pending',!window.smMotion.matches&&!seen.has(item)))}
 sync();items.forEach(item=>observer.observe(item));
 window.smMotion.addEventListener('change',sync);
})();

/* Assemble on first view; pause the ongoing glow while outside the viewport. */
(function(){
 const mark=document.querySelector('.sm-about__welcome');
 if(!mark || !('IntersectionObserver' in window))return;
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  mark.classList.toggle('is-in-view',entry.isIntersecting);
  if(entry.isIntersecting)mark.classList.add('is-visible');
 }),{threshold:.2});
 observer.observe(mark);
})();
