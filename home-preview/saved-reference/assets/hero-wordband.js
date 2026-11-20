(function(){
 const band=document.querySelector('.hero-wordband');if(!band)return;
 const words={stats:['أكثر من ١٥٬٠٠٠ قناة','أكثر من ٥٠٬٠٠٠ فيلم ومسلسل','ثبات ٩٩٫٩٪ في قمة المباريات'],service:['تفعيل فوري في ٥ دقائق','٤ سيرفرات: نوفا وإيستار وموكا و X']};
 function prepare(){
  band.querySelectorAll('.hero-wordband__track').forEach(track=>{
   let group=track.firstElementChild;
   if(!group){
    group=document.createElement('div');group.className='hero-wordband__group';
    for(const text of words[track.dataset.words]){const item=document.createElement('span');item.className='hero-wordband__item';item.textContent=text;group.append(item)}
    track.append(group);
   }
   // Only expand the loop when needed; ordinary resizes do not restart it.
   if(group.scrollWidth<innerWidth*1.2){
    const original=[...group.children];const initial=group.scrollWidth;
    const extra=Math.ceil((innerWidth*1.2)/initial)-1;
    for(let i=0;i<extra;i++)original.forEach(item=>group.append(item.cloneNode(true)));
   }
   if(!track.lastElementChild||track.children.length<2||track.lastElementChild.children.length!==group.children.length){
    if(track.children.length>1)track.lastElementChild.remove();
    track.append(group.cloneNode(true));
   }
   track.style.setProperty('--word-duration',`${Math.max(25,Math.round(group.scrollWidth/55))}s`);
  });
 }
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(prepare,200)},{passive:true});
 let visible=false;function sync(){band.classList.toggle('is-visible',visible&&!document.hidden&&!(window.smMotion&&window.smMotion.matches))}
 if('IntersectionObserver' in window)new IntersectionObserver(e=>{visible=e[0].isIntersecting;sync()},{rootMargin:'100px'}).observe(band);else{visible=true;sync()}
 document.addEventListener('visibilitychange',sync);window.smMotion?.addEventListener('change',sync);
 document.fonts?.ready.then(prepare);prepare();
})();
