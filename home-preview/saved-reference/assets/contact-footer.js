(function(){
 const footer=document.querySelector('.sm-footer');if(!footer)return;
 const button=footer.querySelector('.sm-footer__motion');
 const reduced=window.smMotion;
 let paused=false;
 function update(){footer.classList.toggle('is-paused',paused);button.hidden=reduced.matches;button.textContent=paused?'تشغيل الحركة':'إيقاف الحركة';button.setAttribute('aria-pressed',String(!paused));}
 button.addEventListener('click',()=>{paused=!paused;update()});
 reduced.addEventListener?.('change',update);
 if('IntersectionObserver' in window){new IntersectionObserver(entries=>{footer.classList.toggle('is-offscreen',!entries[0].isIntersecting)},{threshold:0}).observe(footer)}
 update();
})();
