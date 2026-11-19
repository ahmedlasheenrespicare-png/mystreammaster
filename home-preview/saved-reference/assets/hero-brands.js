(function(){
 const strip=document.querySelector('.rose-strip');if(!strip)return;
 const channels=[['bein',0],['ssc',0],['alkass',0],['adsports',1],['mbc',0],['shahid',0],['rotana',1],['osn',0]];
 const platforms=[['netflix',0],['appletv',0],['paramount',0],['hbo',0],['natgeo',0],['discovery',0],['cartoon',0]];
 const rows=[['.hero-brand-row--channels',channels],['.hero-brand-row--platforms',platforms]];
 function update(){
  const width=window.innerWidth;
  const card=width<=600?80:Math.max(82,Math.min(width*.08,122));
  const gap=width<=600?8:Math.max(8,Math.min(width*.01,15));
  for(const [selector,brands] of rows){
   const track=strip.querySelector(selector+' .hero-brand-track');
   // One group always covers the overscanned row; the identical second group
   // makes the translate(-50%) loop seamless even on very wide screens.
   const repeats=Math.ceil((width*2+card)/(brands.length*(card+gap)));
   if(track.dataset.repeats===String(repeats))continue;
   track.dataset.repeats=String(repeats);
   const group=document.createElement('div');group.className='hero-brand-group';
   for(let n=0;n<repeats;n++)for(const [name,dark] of brands){
    const item=document.createElement('div');item.className='hero-brand-card'+(dark?' hero-brand-card--dark':'');
    const img=document.createElement('img');img.src='/images/logos/'+name+'.png';img.alt='';img.decoding='async';item.append(img);group.append(item);
   }
   track.replaceChildren(group,group.cloneNode(true));
   // Keep visual speed steady when more copies are needed for wider screens.
   track.style.setProperty('--brand-duration',`${Math.round(repeats*brands.length*(card+gap)/14)}s`);
  }
 }
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(update,150)},{passive:true});
 update();
})();
