/* Load once when needed, then pause offscreen and preserve playback position. */
(()=>{
 const root=document.querySelector('.sm-matches__stadium'),video=root?.querySelector('video'),motion=window.smMotion;
 if(!root||!video||!motion)return;
 let visible=false,loaded=false;
 function sync(){
  const active=visible&&!document.hidden&&!motion.matches;
  if(!active){video.pause();root.classList.remove('is-playing');return}
  if(!loaded){video.src=video.dataset.src;loaded=true}
  const play=video.play();if(play&&typeof play.catch==='function')play.catch(()=>root.classList.remove('is-playing'));
 }
 video.addEventListener('playing',()=>{if(visible&&!document.hidden&&!motion.matches)root.classList.add('is-playing');else video.pause()});
 video.addEventListener('error',()=>root.classList.remove('is-playing'));
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync()},{threshold:.05}).observe(root);else visible=true;
 document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);sync();
})();
