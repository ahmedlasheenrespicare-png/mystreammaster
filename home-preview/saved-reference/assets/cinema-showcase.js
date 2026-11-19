(function(){const track=document.querySelector('.smcin-track');for(const [file,kicker,title,sub,desc] of [['spider','مغامرة جديدة','البطل','ينطلق','تشويق ومغامرات'],['super','قوة الأمل','حكاية','بطل','عوالم استثنائية'],['iron','قوة وابتكار','المستقبل','يبدأ هنا','أكشن ومغامرات'],['film-godzilla','وحش يهدد المدينة','Godzilla','Minus Zero','خيال ومغامرة'],['film-wildhorse','جزيرة الأسرار','Wild Horse','Nine','دراما وتشويق'],['film-everything','قصة تحت المجهر','You Can See','Everything','وثائقي'],['film-wildwood','رحلة في الغابة','Wildwood','عالم خفي','مغامرة وخيال'],['film-resident','ليلة مرعبة','Resident','Evil','رعب وتشويق'],['film-cycle','لغز من الماضي','The','Cycle','رعب وغموض'],['film-wicker','حكاية غير مألوفة','Wicker','حكاية من الخيال','دراما وخيال'],['film-invite','عشاء غير متوقع','The','Invite','دراما وكوميديا'],['film-tenzing','رحلة نحو القمة','Tenzing','إلى إيفرست','مغامرة ملهمة'],['film-odyssey','رحلة العودة','The','Odyssey','ملحمة ومغامرة'],['series-knight','حكاية فارس','A Knight of','the Seven Kingdoms','مغامرات دنكان وإيج'],['series-dragon','صراع على العرش','House of','the Dragon','حكاية التنين'],['series-starcity','سباق إلى النجوم','Star','City','رحلة إلى الفضاء'],['series-silo','أسرار تحت الأرض','Silo','خلف الجدران','غموض وتشويق'],['series-vision','رحلة الذاكرة','Vision','Quest','بحث عن الماضي'],['series-pitt','نبض الطوارئ','The','Pitt','حياة على المحك'],['series-dutton','حكاية عائلة','Dutton','Ranch','حياة على الحدود'],['series-testaments','صوت المقاومة','The','Testaments','حكايات من جلعاد'],['series-legends','مهمة سرية','Legends','وجوه خفية','تشويق وجريمة'],['series-sherlock','بداية المحقق','Young','Sherlock','لغز في أكسفورد'],['series-widow','أسرار الساحل',"Widow's",'Bay','غموض وتشويق'],['series-stranger','أسرار المدينة','Stranger','Things','خيال وغموض'],['series-beef','خلاف غير متوقع','Beef','وجوه متقابلة','دراما وكوميديا'],['series-bear','داخل المطبخ','The','Bear','دراما وطموح'],['series-earlyspring','بدايات جديدة','The Early','Spring','حكاية في الربيع'],['series-lesson','درس لا يُنسى','Teach You','a Lesson','دراما وتشويق'],['series-jade','رحلة عبر الزمن','Pursuit','of Jade','دراما تاريخية']]){const panel=track.firstElementChild.cloneNode(true);panel.querySelector('img').loading='lazy';panel.querySelector('img').dataset.src=new URL('cinema-layers/',document.currentScript.src).href+(/^(film|series)-/.test(file)?file:'scene-'+file)+'.jpg';panel.querySelector('img').removeAttribute('src');panel.querySelector('.smcin-mini-content small').textContent=kicker;const strong=panel.querySelector('.smcin-mini-content strong');strong.replaceChildren(document.createTextNode(title),document.createElement('br'));const em=document.createElement('em');em.textContent=sub;strong.append(em);panel.querySelector('.smcin-mini-content p').textContent=desc;track.append(panel)}})();
// Six Arabic films use the same layered animation as the existing library scenes.
(function(){
 const track=document.querySelector('#cinema-library .smcin-track');if(!track)return;
 const base=new URL('cinema-layers/',document.currentScript.src).href;
 const version=new URL(document.currentScript.src).search;
 for(const [id,title,desc] of [['0','أسد','دراما تاريخية'],['5','صقر وكناريا','أكشن وكوميديا'],['4','برشامة','كوميديا'],['8','مطلوب عائلياً','كوميديا عائلية'],['6','الجواهرجي','كوميديا اجتماعية'],['3','إيجي بست','دراما وتشويق']]){
  const panel=track.firstElementChild.cloneNode(true);panel.dataset.arabicFilm=id;
  const image=panel.querySelector('img');image.loading='lazy';image.decoding='async';image.dataset.src=base+'arabic-film-'+id+'.jpg'+version;image.removeAttribute('src');
  panel.querySelector('.smcin-mini-content small').textContent='من السينما العربية';
  panel.querySelector('.smcin-mini-content strong').textContent=title;
  panel.querySelector('.smcin-mini-content p').textContent=desc;
  track.append(panel);
 }
})();
document.querySelectorAll('#cinema-library .smcin-track > .smcin-panel').forEach((panel,i)=>{for(const [role,extension] of [['backdrop','jpg'],['person','webp']]){const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.className='smcin-'+role;img.alt='';img.setAttribute('aria-hidden','true');img.dataset.src=new URL('cinema-layers/',document.currentScript.src).href+(panel.dataset.arabicFilm!==undefined?'arabic-'+(role==='backdrop'?'backdrop-':'person-')+panel.dataset.arabicFilm:(role==='backdrop'?'clean-':'person-')+(i+1))+'.'+extension+(panel.dataset.arabicFilm!==undefined?new URL(document.currentScript.src).search:'?v=refined2');panel.insertBefore(img,panel.querySelector('.smcin-overlay'))}});

(()=>{
 const root=document.querySelector('#cinema-library');if(!root)return;const stage=root.querySelector('.smcin-stage'),rail=root.querySelector('.smcin-rail'),track=root.querySelector('.smcin-track'),original=[...track.children],reduced=window.smMotion||matchMedia('(prefers-reduced-motion: reduce)');
 // Keep source URLs without decoding every poster and character at once.
 original.forEach((panel,i)=>{panel.dataset.sceneId=String(i);const img=panel.querySelector('img');if(img&&!img.dataset.src)img.dataset.src=img.getAttribute('src')||'';img?.removeAttribute('src')});
 // Shuffle once per visit, then loop the same complete sequence without repeats or omissions.
 for(let i=original.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[original[i],original[j]]=[original[j],original[i]]}
 track.replaceChildren(...original);
 track.classList.add('smcin-enhanced');const left=original.map(el=>el.cloneNode(true)),right=original.map(el=>el.cloneNode(true));left.reverse().forEach(el=>track.prepend(el));right.forEach(el=>track.append(el));const panels=[...track.children],length=original.length;
 // Reveal composited layers only after both files are usable; a failed file leaves the original image intact.
 panels.forEach(panel=>{const parts=[...panel.querySelectorAll('img.smcin-backdrop,img.smcin-person')];if(parts.length!==2)return;const update=()=>panel.classList.toggle('smcin-layers-ready',parts.every(img=>img.complete&&img.naturalWidth>0));parts.forEach(img=>{img.addEventListener('load',update);img.addEventListener('error',update)});update()});
 let visible=false,playing=!reduced.matches,lastReduced=reduced.matches,timer=0,deadline=0,remaining=0,index=length,phase='wide-reel',focused=false,lastWidth=0;
 function metrics(){const width=rail.clientWidth,gap=Math.max(3,width*.012),tile=(width-gap*4)/5,feature=width*.60;return {width,gap,tile,feature}}
 function layout(animate=true){const {width,gap,tile,feature}=metrics();lastWidth=width;track.style.setProperty('--gap',`${gap}px`);track.style.setProperty('--tile',`${tile}px`);track.style.setProperty('--feature',`${feature}px`);const focal=width*(focused?.42:.5);const shift=focal-(index*(tile+gap)+(focused?feature:tile)/2);if(!animate)track.classList.add('smcin-no-transition');track.style.setProperty('--shift',`${shift}px`);if(!animate){void track.offsetWidth;track.classList.remove('smcin-no-transition')}}
 function stop(preserve=false){
  if(timer&&preserve)remaining=Math.max(0,deadline-performance.now());
  else if(!preserve)remaining=0;
  clearTimeout(timer);timer=0;deadline=0;
 }
 function scheduleTick(delay){remaining=0;deadline=performance.now()+delay;timer=setTimeout(tick,delay)}
 // Only the five visible strips and a small look-ahead need decoded posters.
 // Full-resolution character layers are limited to the current and next scene.
 function prepare(){
  panels.forEach((panel,n)=>{
   const near=Math.abs(n-index)<=4,featured=!reduced.matches&&(n===index||n===index+1);
   const poster=panel.querySelector('img:not(.smcin-backdrop):not(.smcin-person)');
   if(poster){if(visible&&near&&!poster.hasAttribute('src')&&poster.dataset.src)poster.src=poster.dataset.src;else if(!near&&poster.hasAttribute('src'))poster.removeAttribute('src')}
   panel.querySelectorAll('img.smcin-backdrop,img.smcin-person').forEach(img=>{
    if(visible&&featured&&!img.hasAttribute('src')&&img.dataset.src)img.src=img.dataset.src;
    else if(!featured&&img.hasAttribute('src'))img.removeAttribute('src');
   });
   if(!featured)panel.classList.remove('smcin-layers-ready');
  });
 }
 function mark(){panels.forEach((p,n)=>p.classList.toggle('smcin-active',focused&&n===index));prepare()}
 function resetCopy(){index-=length;track.classList.add('smcin-no-transition');panels.forEach(p=>p.style.transition='none');mark();layout(false);void track.offsetWidth;panels.forEach(p=>p.style.removeProperty('transition'));track.classList.remove('smcin-no-transition')}
 // Return characters to their starting position before advancing the reel.
 const returnDuration=3100;
 function tick(){
  timer=0;deadline=0;remaining=0;if(!playing||!visible||document.hidden)return;
  if(!focused){focused=true;phase='feature';mark();layout();scheduleTick(6000);return}
  if(phase!=='returning'){phase='returning';panels[index].classList.add('smcin-returning');scheduleTick(returnDuration);return}
  panels[index].classList.remove('smcin-returning');
  if(index>=length*2)resetCopy();index++;phase='feature';mark();layout();scheduleTick(6000);
 }
 // Preserve the exact visual position of in-flight CSS transitions as well as the timer.
 let pausedAnimations=[];
 function sync(){
  stop(true);
  if(!visible||document.hidden){
   if(stage.getAnimations)stage.getAnimations({subtree:true}).forEach(animation=>{if(animation.playState==='running'){animation.pause();pausedAnimations.push(animation)}});
   return;
  }
  pausedAnimations.forEach(animation=>{if(animation.playState==='paused')animation.play()});pausedAnimations=[];
  if(!playing)return;scheduleTick(remaining||(phase==='returning'?returnDuration:focused?6000:700));
 }
 const touch=stage.querySelector('.preview-touch--cinema'),controls=stage.querySelector('.preview-controls--cinema');let resumeTimer=0;
 function pauseTemporarily(){
  playing=false;stop();panels.forEach(p=>p.classList.remove('smcin-returning'));phase='feature';focused=true;mark();layout();controls.hidden=false;controls.classList.add('is-visible');
  clearTimeout(resumeTimer);resumeTimer=setTimeout(()=>{controls.classList.remove('is-visible');controls.hidden=true;playing=!reduced.matches;sync()},5000);
 }
 touch.addEventListener('click',pauseTemporarily);
 function step(direction){pauseTemporarily();index+=direction;if(index<length){index+=length;layout(false)}else if(index>=length*2){index-=length;layout(false)}mark();layout()}
 root.querySelectorAll('[data-cinema-step]').forEach(button=>button.addEventListener('click',()=>step(Number(button.dataset.cinemaStep))));
 window.smDisplaySwipe(stage,step);

 reduced.addEventListener?.('change',()=>{if(reduced.matches===lastReduced)return;lastReduced=reduced.matches;playing=!reduced.matches;if(reduced.matches){panels.forEach(panel=>panel.classList.remove('smcin-returning'));index=length;phase='wide-reel';focused=false;mark();layout(false)}clearTimeout(resumeTimer);controls.classList.remove('is-visible');controls.hidden=true;sync()});document.addEventListener('visibilitychange',sync);const resize=()=>{if(Math.abs(rail.clientWidth-lastWidth)>1)layout(false)};if('ResizeObserver'in window)new ResizeObserver(resize).observe(rail);else window.addEventListener('resize',resize,{passive:true});if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;prepare();sync()},{threshold:.2}).observe(stage);else{visible=true;prepare();sync()}layout(false);
})();
