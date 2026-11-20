/* Jump to representative moments in the existing, single MP4. */
(function(){
 const films=[...document.querySelectorAll('.hero-film video')],motion=window.smMotion;
 const previous=document.querySelector('[data-hero-step="-1"]'),next=document.querySelector('[data-hero-step="1"]'),touch=document.querySelector('.preview-touch--hero'),controls=document.querySelector('.preview-controls--hero');
 const points=[.8,5.5,10.5,...Array.from({length:30},(_,i)=>16+i*1.68+1),67.3,93.5];
 let userPaused=false,visible=new WeakSet(),lastFilm=null,resumeTimer=0;
 const active=()=>films.find(v=>getComputedStyle(v.parentElement).display!=='none');
 function sync(){
  const current=active();if(!current)return;
  if(lastFilm&&current!==lastFilm&&lastFilm.currentTime){const t=lastFilm.currentTime;const seek=()=>{current.currentTime=t};if(current.readyState)seek();else current.addEventListener('loadedmetadata',seek,{once:true})}lastFilm=current;
  films.forEach(v=>{if(v!==current){v.pause();v.classList.remove('is-playing')}});
  if(!visible.has(current)||document.hidden||userPaused||motion.matches){current.pause();return}
  if(!current.src)current.src=current.dataset.src;
  current.play().then(()=>{if(!userPaused&&!motion.matches&&!document.hidden&&visible.has(current))current.classList.add('is-playing');else current.pause()}).catch(()=>{});
 }
 function pauseTemporarily(){userPaused=true;active()?.pause();controls.hidden=false;controls.classList.add('is-visible');clearTimeout(resumeTimer);resumeTimer=setTimeout(()=>{userPaused=false;controls.classList.remove('is-visible');controls.hidden=true;sync()},5000)}
 function showFrame(video,time){if(!video.src)video.src=video.dataset.src;const seek=()=>{video.currentTime=time;video.classList.add('is-playing')};if(video.readyState)seek();else video.addEventListener('loadedmetadata',seek,{once:true})}
 function step(direction){const video=active();if(!video)return;const t=video.currentTime;let i=points.findIndex(p=>p>t+.15);if(i<0)i=points.length;let target=direction>0?(i===points.length?0:i):(i<=1?points.length-1:i-2);pauseTemporarily();showFrame(video,points[target])}
 window.smDisplaySwipe(document.querySelector('.ban__oval'),step);touch.addEventListener('click',pauseTemporarily);previous.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
 if('IntersectionObserver' in window){const ob=new IntersectionObserver(entries=>{entries.forEach(e=>e.isIntersecting?visible.add(e.target):visible.delete(e.target));sync()},{threshold:.2});films.forEach(v=>ob.observe(v))}else films.forEach(v=>visible.add(v));
 motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);window.addEventListener('resize',sync,{passive:true});sync();
})();
