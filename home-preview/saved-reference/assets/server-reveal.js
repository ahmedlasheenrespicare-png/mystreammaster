/* Reveal each complete project as it enters view, on phones and desktops. */
(function(){
 const cards=[...document.querySelectorAll('.sm-servers .sm-server')];
 if(!('IntersectionObserver' in window))return;
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}
 }),{threshold:.12});
 cards.forEach(card=>observer.observe(card));
})();
