(()=>{
 const section=document.querySelector('#league-strip'),rail=section.querySelector('.sm-leagues__cards'),count=section.querySelectorAll('.sm-leagues__card').length;
 const icon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 for(const [direction,label] of [[-1,'البطولة السابقة'],[1,'البطولة التالية']]){
  const button=document.createElement('button');button.type='button';button.className='section-carousel-nav section-carousel-nav--'+(direction<0?'previous':'next');button.setAttribute('aria-label',label);button.innerHTML=icon+'<span>'+label+'</span>';
  button.addEventListener('click',()=>{const gallery=window.smLeagueGallery;if(gallery)gallery.go((gallery.getSelected()+direction+count)%count,direction)});rail.append(button);
 }
 document.addEventListener('DOMContentLoaded',()=>{
  // Introduce the visual once when the selector enters view, not on each change.
  let introduced=false;const introAnimations=[];
  window.addEventListener('sm-motion-change',()=>{if(window.smMotion.matches)introAnimations.forEach(animation=>animation.cancel())});
  function introduce(){
   if(introduced)return;introduced=true;
   if(window.smMotion.matches)return;
   rail.classList.add('reference-entered');
   const emblem=rail.querySelector('.sm-leagues__card:not([hidden]) .sm-leagues__image img');
   if(emblem)introAnimations.push(emblem.animate([{opacity:0,transform:'translateY(14px) scale(.96)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:800,delay:200,easing:'cubic-bezier(.215,.61,.355,1)'}));
   rail.querySelectorAll('.sm-leagues__neighbour,.section-carousel-nav').forEach((element,index)=>introAnimations.push(element.animate([{opacity:0},{opacity:getComputedStyle(element).opacity}],{duration:600,delay:320+index*55,easing:'ease-out'})));
   const launch=section.querySelector('.world-launch');
   if(launch)introAnimations.push(launch.animate([{opacity:0},{opacity:1}],{duration:500,delay:400,easing:'ease-out'}));
  }
  if('IntersectionObserver' in window){const introObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){introduce();introObserver.disconnect()}},{threshold:.12});introObserver.observe(rail)}else introduce();
  const strip=section.querySelector('.sm-leagues__mini');
  strip.querySelectorAll('button').forEach(button=>{
   const label=button.lastElementChild?.textContent.trim();
   if(label){button.setAttribute('aria-label',label);button.title=label}
  });
  if(window.smMotion.matches || !('IntersectionObserver' in window))strip.classList.add('strip-visible');
  else {
   const stripObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){strip.classList.add('strip-visible');stripObserver.disconnect()}},{threshold:.1});
   stripObserver.observe(strip);
  }
  window.addEventListener('sm-motion-change',()=>{if(window.smMotion.matches)strip.classList.add('strip-visible')});
  const stats=section.querySelector('.sm-leagues__stats');
  if(window.smMotion.matches || !('IntersectionObserver' in window))stats.classList.add('stats-visible');
  else {
   const statsObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){stats.classList.add('stats-visible');statsObserver.disconnect()}},{threshold:.15});
   statsObserver.observe(stats);
  }
  window.addEventListener('sm-motion-change',()=>{if(window.smMotion.matches)stats.classList.add('stats-visible')});
  const card=section.querySelector('.sm-leagues__card');
  const originals=card.querySelectorAll('.sm-leagues__actions button[data-view]');
  if(originals.length!==3)return;
  const bar=document.createElement('div');bar.className='league-fixed-actions';bar.setAttribute('role','group');bar.setAttribute('aria-label','بيانات البطولة المختارة');
  let opening=false;
  const iconPaths={standings:'<path d="M4 4h16v16H4zM4 9h16M9 9v11M13 13h4M13 17h4"/>',rates:'<path d="M4 20V4M4 20h16M8 16v-5M12 16V7M16 16v-3M20 16V5"/>',matches:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 17h2"/>'};
  originals.forEach(original=>{
   const button=original.cloneNode(true);button.removeAttribute('aria-controls');button.removeAttribute('aria-expanded');
   if(!button.querySelector('svg'))button.insertAdjacentHTML('afterbegin','<svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+iconPaths[button.dataset.view]+'</svg>');
   [...button.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE && node.textContent.trim()).forEach(node=>{const label=document.createElement('span');label.className='league-action-label';label.textContent=node.textContent;node.replaceWith(label)});
   button.addEventListener('click',()=>{
    if(opening)return;
    const selected=section.querySelector('.sm-leagues__card:not([hidden]) .sm-leagues__actions button[data-view="'+button.dataset.view+'"]');
    if(!selected)return;
    if(window.smMotion.matches){selected.click();return}
    opening=true;button.classList.add('is-activating');
    setTimeout(()=>{button.classList.remove('is-activating');opening=false;if(selected.isConnected && !selected.closest('.sm-leagues__card').hidden)selected.click()},140);
   });
   bar.append(button);
  });
  rail.append(bar);section.classList.add('has-fixed-actions');
  if(window.smMotion.matches || !('IntersectionObserver' in window))bar.classList.add('is-visible');
  else {
   const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){bar.classList.add('is-visible');observer.disconnect()}},{threshold:.15});
   observer.observe(bar);
  }
  window.addEventListener('sm-motion-change',()=>{if(window.smMotion.matches)bar.classList.add('is-visible')});
  // The source icons are inserted by a module after its controls are created.
  requestAnimationFrame(()=>{
   bar.querySelectorAll('button').forEach(button=>{
    const svg=card.querySelector('.sm-leagues__actions button[data-view="'+button.dataset.view+'"] .action-icon');
    if(svg && !button.querySelector('svg'))button.prepend(svg.cloneNode(true));
   });
  });
 });
})();
/* Place the world entry beneath the three controls, as in the reference. */
document.addEventListener('DOMContentLoaded',()=>{
 const section=document.querySelector('#league-strip');
 const rail=section?.querySelector('.sm-leagues__cards');
 const launch=section?.querySelector('.world-launch');
 if(!rail||!launch)return;
 rail.append(launch);
 section.querySelectorAll('.sm-leagues__card .sm-leagues__actions a').forEach(link=>link.remove());
});
