(function(){
 const strip=document.querySelector('.rose-strip');if(!strip)return;
 // The reel's unique scene IDs and poster sources are the source of truth,
 // so the preview includes every scene without a separate hand-maintained list.
 const originals=new Map();
 document.querySelectorAll('#cinema-library .smcin-panel[data-scene-id]').forEach(panel=>{
  const id=panel.dataset.sceneId;if(!originals.has(id))originals.set(id,panel);
 });
 const names={'5':'Spider-Man','6':'Superman','7':'Iron Man'};
 const groups=strip.querySelectorAll('.rose-strip__group');
 for(const group of groups){
  for(const [id,panel] of originals){
   const source=panel.querySelector('img:not(.smcin-backdrop):not(.smcin-person)');if(!source?.dataset.src)continue;
   const card=document.createElement('div');card.className='rose-strip__card';card.dataset.sceneId=id;
   const img=document.createElement('img');img.src=source.dataset.src;img.loading='lazy';img.decoding='async';img.alt='';
   const label=document.createElement('span');label.textContent=names[id]||panel.querySelector('.smcin-mini-content strong')?.textContent||'';label.dir='auto';
   card.append(img,label);group.append(card);
  }
 }
 const sync=(visible)=>strip.classList.toggle('is-visible',visible&&!document.hidden&&!(window.smMotion&&window.smMotion.matches));
 let inView=false;
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync(inView)},{rootMargin:'100px'}).observe(strip);else{inView=true;sync(true)}
 document.addEventListener('visibilitychange',()=>sync(inView));window.smMotion?.addEventListener('change',()=>sync(inView));
})();
