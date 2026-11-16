/* Decorative video: auto-play only in view and when motion is enabled. A
   deliberate play remains available regardless of the motion preference. */
(function(){
 const container=document.querySelector('.abt__video');
 const video=container?.querySelector('video'),button=container?.querySelector('.video-play-fallback');
 if(!video||!button)return;
 let visible=!('IntersectionObserver' in window),userPaused=false,failed=false;
 function update(){
  const playing=!video.paused&&!video.ended;
  container.classList.toggle('is-playing',playing);
  button.textContent=failed?'فتح الفيديو مباشرة':playing?'❚❚ إيقاف الفيديو':'▶ تشغيل الفيديو';
  button.setAttribute('aria-label',failed?'فتح فيديو ستريم ماستر مباشرة':playing?'إيقاف فيديو ستريم ماستر':'تشغيل فيديو ستريم ماستر');
 }
 function attempt(){
  video.muted=true;
  const result=video.play();
  if(result&&typeof result.catch==='function')result.catch(()=>{update()});
 }
 function sync(){
  if(!visible||document.hidden){if(!video.paused)video.pause()}
  else if(!window.smMotion.matches&&!userPaused&&video.paused&&!failed)attempt();
  update();
 }
 video.addEventListener('playing',update);video.addEventListener('pause',update);
 video.addEventListener('error',()=>{failed=true;video.controls=true;update()});
 button.addEventListener('click',()=>{
  if(failed){window.open(video.currentSrc||video.src,'_blank','noopener');return}
  if(video.paused){userPaused=false;attempt()}else{userPaused=true;video.pause()}
  update();
 });
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync()},{threshold:.2}).observe(video);
 window.smMotion.addEventListener('change',()=>{if(window.smMotion.matches&&!video.paused)video.pause();sync()});
 document.addEventListener('visibilitychange',sync);sync();
 if(new URLSearchParams(location.search).get('showvideo')==='1'){
  let tries=0;const timer=setInterval(()=>{
   const loader=document.querySelector('.loader');
   if((loader&&getComputedStyle(loader).display==='none')||++tries>50){clearInterval(timer);setTimeout(()=>{const box=video.getBoundingClientRect();window.scrollTo({top:window.scrollY+box.top-window.innerHeight*.2,behavior:'auto'})},4000)}
  },200);
 }
})();
