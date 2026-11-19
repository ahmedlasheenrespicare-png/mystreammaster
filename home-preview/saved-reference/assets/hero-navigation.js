(function(){
 const menu=document.querySelector('.nav__menu'),button=document.querySelector('.nav__menu-btn');
 if(!menu||!button)return;
 const nav=document.querySelector('.nav');let previous=window.scrollY;
 window.addEventListener('scroll',()=>{
  const y=window.scrollY, delta=y-previous;
  if(y<80||button.classList.contains('open')){nav.classList.remove('is-scrolled-away');previous=y;return}
  if(Math.abs(delta)<5)return;
  nav.classList.toggle('is-scrolled-away',delta>0);previous=y;
 },{passive:true});
 function closeMenu(){if(button.classList.contains('open'))button.click()}
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&button.classList.contains('open')){closeMenu();button.focus()}});
 document.addEventListener('click',event=>{
  const link=event.target.closest('.nav__links a[data-nav-section],.nav__menu a[data-nav-section],.nav__menu a[href="#servers-compare"]');
  if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  if(menu.contains(link))closeMenu();
  // The shared comparison handler opens all server specifications itself.
  if(link.getAttribute('href')==='#servers-compare')return;
  const target=document.querySelector(link.getAttribute('href'));if(!target)return;
  event.preventDefault();history.pushState(null,'',link.getAttribute('href'));
  if(innerWidth>=600&&window.smScrollToSection)window.smScrollToSection(target);
  else target.scrollIntoView({behavior:window.smMotion?.matches?'instant':'smooth',block:'start'});
 });
})();
