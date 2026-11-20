/* Each device turns independently; the real button exposes its state. */
(function(){
 document.querySelectorAll('.sm-about .sm-device__button').forEach(button=>{
  button.addEventListener('click',()=>{
   const flipped=button.getAttribute('aria-pressed')!=='true';
   button.setAttribute('aria-pressed',String(flipped));
  });
 });
})();
