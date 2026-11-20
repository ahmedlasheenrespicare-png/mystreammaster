(()=>{
  const nav=document.querySelector('.nav'),button=nav.querySelector('.nav__menu-btn'),menu=document.querySelector('.nav__menu');
  function setMenu(open){menu.classList.toggle('open',open);button.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة');}
  button.addEventListener('click',()=>setMenu(!menu.classList.contains('open')));
  menu.querySelector('.bg').addEventListener('click',()=>setMenu(false));
  menu.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('open')){setMenu(false);button.focus()}});
  let previous=window.scrollY;window.addEventListener('scroll',()=>{const y=window.scrollY,delta=y-previous;if(y<80||menu.classList.contains('open'))nav.classList.remove('is-scrolled-away');else if(Math.abs(delta)>=5)nav.classList.toggle('is-scrolled-away',delta>0);if(Math.abs(delta)>=5||y<80)previous=y},{passive:true});
  const year=document.querySelector('[data-footer-year]');if(year)year.textContent=String(new Date().getFullYear());
  const setting=document.querySelector('#sm-motion-setting');
  if(setting){try{setting.value=localStorage.getItem('sm-motion-preference')||'auto'}catch{}function update(){let value=setting.value;document.documentElement.dataset.motionReduced=String(value==='off'||(value==='auto'&&matchMedia('(prefers-reduced-motion: reduce)').matches));try{localStorage.setItem('sm-motion-preference',value)}catch{}}setting.addEventListener('change',update);update();}
})();
