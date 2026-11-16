/* Share the live site's stored motion preference. */
(function(){
 const key='sm-motion-preference', native=matchMedia('(prefers-reduced-motion: reduce)');
 let pref='on';
 try{const value=localStorage.getItem(key);if(['auto','on','off'].includes(value))pref=value}catch(_){}
 const listeners=new Set();
 const media={get matches(){return pref==='off'||(pref==='auto'&&native.matches)},addEventListener(type,fn){if(type==='change')listeners.add(fn)},removeEventListener(type,fn){if(type==='change')listeners.delete(fn)}};
 function sync(){document.documentElement.dataset.motion=pref;document.documentElement.dataset.motionReduced=String(media.matches);const select=document.getElementById('sm-motion-setting');if(select)select.value=pref;const note=document.getElementById('sm-motion-note');if(note)note.textContent=pref==='on'?'الحركات مفعّلة بغض النظر عن إعداد الجهاز.':pref==='off'?'حركات الأقسام المخصصة متوقفة.':native.matches?'تقليل الحركة مفعّل في جهازك.':'الحركات تتبع إعداد جهازك.';listeners.forEach(fn=>fn());window.dispatchEvent(new Event('sm-motion-change'))}
 window.smMotion=media;
 native.addEventListener?.('change',sync);
 window.addEventListener('storage',e=>{if(e.key===key){pref=['auto','on','off'].includes(e.newValue)?e.newValue:'on';sync()}});
 document.addEventListener('DOMContentLoaded',()=>{const select=document.getElementById('sm-motion-setting');if(!select)return;sync();select.addEventListener('change',()=>{pref=select.value;try{localStorage.setItem(key,pref)}catch(_){}sync()})});
 sync();
})();
