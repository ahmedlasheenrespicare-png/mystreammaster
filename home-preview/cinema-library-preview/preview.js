(()=>{
 const root=document.querySelector('#cinema-library');if(!root)return;const stage=root.querySelector('.smcin-stage'),rail=root.querySelector('.smcin-rail'),track=root.querySelector('.smcin-track'),original=[...track.children],reduced=window.smMotion||matchMedia('(prefers-reduced-motion: reduce)');
 // Shuffle once per visit, then loop the same complete sequence without repeats or omissions.
 original.forEach((panel,i)=>panel.dataset.sceneId=String(i));
 for(let i=original.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[original[i],original[j]]=[original[j],original[i]]}
 track.replaceChildren(...original);
 track.classList.add('smcin-enhanced');const left=original.map(el=>el.cloneNode(true)),right=original.map(el=>el.cloneNode(true));left.reverse().forEach(el=>track.prepend(el));right.forEach(el=>track.append(el));const panels=[...track.children],length=original.length;
 // Reveal composited layers only after both files are usable; a failed file leaves the original image intact.
 panels.forEach(panel=>{const parts=[...panel.querySelectorAll('img.smcin-backdrop,img.smcin-person')];if(parts.length!==2)return;const update=()=>panel.classList.toggle('smcin-layers-ready',parts.every(img=>img.complete&&img.naturalWidth>0));parts.forEach(img=>{img.addEventListener('load',update);img.addEventListener('error',update)});update()});
 let visible=false,playing=!reduced.matches,lastReduced=reduced.matches,timer=0,index=length,phase='wide-reel',focused=false,lastWidth=0;
 function metrics(){const width=rail.clientWidth,gap=Math.max(3,width*.012),tile=(width-gap*4)/5,feature=width*.60;return {width,gap,tile,feature}}
 function layout(animate=true){const {width,gap,tile,feature}=metrics();lastWidth=width;track.style.setProperty('--gap',`${gap}px`);track.style.setProperty('--tile',`${tile}px`);track.style.setProperty('--feature',`${feature}px`);const focal=width*(focused?.42:.5);const shift=focal-(index*(tile+gap)+(focused?feature:tile)/2);if(!animate)track.classList.add('smcin-no-transition');track.style.setProperty('--shift',`${shift}px`);if(!animate){void track.offsetWidth;track.classList.remove('smcin-no-transition')}}
 function stop(){clearTimeout(timer);timer=0}
 function mark(){panels.forEach((p,n)=>p.classList.toggle('smcin-active',focused&&n===index))}
 function resetCopy(){index-=length;track.classList.add('smcin-no-transition');panels.forEach(p=>p.style.transition='none');mark();layout(false);void track.offsetWidth;panels.forEach(p=>p.style.removeProperty('transition'));track.classList.remove('smcin-no-transition')}
 // Keep one scene featured while the next one opens, then dwell for the character motion.
 function tick(){timer=0;if(!playing||!visible||document.hidden)return;if(!focused){focused=true;phase='feature'}else{if(index>=length*2)resetCopy();index++}mark();layout();timer=setTimeout(tick,6000)}
 function sync(){stop();if(!playing||!visible||document.hidden)return;timer=setTimeout(tick,focused?6000:700)}
 window.cinemaPreviewSelect=(n)=>{if(!Number.isInteger(n)||n<0||n>=length)return;const position=original.findIndex(panel=>Number(panel.dataset.sceneId)===n);if(position<0)return;stop();index=length+position;focused=true;phase='feature';mark();layout(false);if(playing&&visible&&!document.hidden)timer=setTimeout(tick,8000)};
 window.cinemaPreviewReplay=()=>{if(!focused)return;const panel=panels[index];panel.classList.remove('smcin-active');void panel.offsetWidth;panel.classList.add('smcin-active');stop();if(playing&&visible&&!document.hidden)timer=setTimeout(tick,8000)};
 reduced.addEventListener?.('change',()=>{if(reduced.matches===lastReduced)return;lastReduced=reduced.matches;playing=!reduced.matches;if(reduced.matches){index=length;phase='wide-reel';focused=false;mark();layout(false)}sync()});document.addEventListener('visibilitychange',sync);const resize=()=>{if(Math.abs(rail.clientWidth-lastWidth)>1)layout(false)};if('ResizeObserver'in window)new ResizeObserver(resize).observe(rail);else window.addEventListener('resize',resize,{passive:true});if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:.2}).observe(stage);else{visible=true;sync()}layout(false);
})();
