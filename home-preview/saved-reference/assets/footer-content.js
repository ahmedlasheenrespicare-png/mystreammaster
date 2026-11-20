(()=>{
 const year=document.querySelector('[data-footer-year]');if(year)year.textContent=String(new Date().getFullYear());
 const button=document.querySelector('.sm-quick-action--top'),top=document.getElementById('top');if(!button||!top)return;
 let frame=0;function update(){frame=0;button.hidden=window.scrollY<=400}
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('sm-smooth-scroll',schedule,{passive:true});
 button.addEventListener('click',()=>{if(innerWidth>=600&&window.smScrollToSection)window.smScrollToSection(top);else window.scrollTo({top:0,behavior:window.smMotion?.matches?'instant':'smooth'})});update();
})();
