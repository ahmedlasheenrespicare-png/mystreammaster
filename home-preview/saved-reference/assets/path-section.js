/* Desktop shows all three paths; mobile uses native grouped accordions. */
(function(){
 const cards=[...document.querySelectorAll('.sm-path__card')];if(!cards.length)return;
 const desktop=matchMedia('(min-width: 1024px)');
 function layout(){cards.forEach(card=>{if(desktop.matches){card.removeAttribute('name');card.open=true}else{card.open=false;card.name='sm-path-options'}})}
 desktop.addEventListener?.('change',layout);layout();
 // Keep the image strictly above the subscription button at every card size.
 let artFrame=0;
 function measureArt(){artFrame=0;cards.forEach(card=>{const button=card.querySelector('.sm-path__buy');if(!card.open||!button){card.style.setProperty('--path-art-bottom','0px');return}const box=card.getBoundingClientRect(),action=button.getBoundingClientRect();card.style.setProperty('--path-art-bottom',`${Math.max(0,box.bottom-action.top).toFixed(1)}px`)})}
 function queueArt(){if(!artFrame)artFrame=requestAnimationFrame(measureArt)}
 cards.forEach(card=>card.addEventListener('toggle',queueArt));window.addEventListener('resize',queueArt,{passive:true});document.fonts?.ready.then(queueArt);
 if('ResizeObserver' in window){const observer=new ResizeObserver(queueArt);cards.forEach(card=>observer.observe(card))}queueArt();
 if(!('IntersectionObserver' in window))return;
 const items=[document.querySelector('.sm-path__heading h2'),document.querySelector('.sm-path__intro > div'),document.querySelector('.sm-path__trial'),...cards].filter(Boolean),seen=new WeakSet();
 const observer=new IntersectionObserver(entries=>{entries.forEach(({target,isIntersecting})=>{if(isIntersecting){if(target.matches('h2'))target.closest('.sm-path__heading').classList.add('is-visible');seen.add(target);target.classList.remove('sm-path-pending');observer.unobserve(target)}})},{threshold:.1});
 function sync(){items.forEach(item=>item.classList.toggle('sm-path-pending',!window.smMotion.matches&&!seen.has(item)))}
 items.forEach(item=>item.addEventListener('focusin',()=>{seen.add(item);item.classList.remove('sm-path-pending');observer.unobserve(item)}));
 sync();items.forEach(item=>observer.observe(item));window.smMotion.addEventListener('change',sync);
})();

/* The handwritten accent drifts with the heading in both scroll directions.
   Measure the untransformed heading, so the accent never feeds back into its own position. */
(function(){
 const heading=document.querySelector('.sm-path__heading'),script=heading?.querySelector('.sm-path__script'),motion=window.smMotion;
 if(!heading||!script||!motion)return;
 let inView=false,frame=0,lastY=NaN;
 function draw(){
  frame=0;if(!inView||motion.matches||document.hidden)return;
  const rect=heading.getBoundingClientRect(),viewport=window.innerHeight||1;
  const progress=Math.max(-1,Math.min(1,((viewport/2)-(rect.top+rect.height/2))/(viewport*.7)));
  const distance=Math.min(110,rect.height*.24);
  const y=Math.round(progress*distance*10)/10;
  if(y!==lastY){script.style.setProperty('--sm-path-script-y',`${y}px`);lastY=y}
  frame=requestAnimationFrame(draw);
 }
 function sync(){if(!inView||motion.matches||document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;if(motion.matches){script.style.removeProperty('--sm-path-script-y');lastY=NaN}return}if(!frame)frame=requestAnimationFrame(draw)}
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting);sync()},{rootMargin:'100px'}).observe(heading);else inView=true;
 motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
})();

/* Preview only visible cards after the visitor pauses; never move the page or open a path. */
(function(){
 const section=document.querySelector('#path-section'),cards=[...document.querySelectorAll('.sm-path__card')],motion=window.smMotion;
 if(!section||!cards.length||!motion||!('IntersectionObserver' in window))return;
 const visible=new Set(),progress=section.querySelector('.sm-path__progress'),dots=[...section.querySelectorAll('.sm-path__progress span')];let timer=0,index=-1,hovering=false;
 function clear(){if(timer)clearTimeout(timer);timer=0;cards.forEach(card=>card.classList.remove('is-idle'));progress?.classList.remove('is-visible');dots.forEach(dot=>dot.classList.remove('is-current'))}
 function blocked(){return motion.matches||document.hidden||hovering||section.contains(document.activeElement)||!visible.size}
 function schedule(delay=2800){clear();if(blocked())return;timer=setTimeout(step,delay)}
 function step(){timer=0;if(blocked()){clear();return}const eligible=cards.filter(card=>visible.has(card)&&!card.classList.contains('sm-path-pending'));if(!eligible.length){schedule();return}const previous=cards[index];let next=eligible.indexOf(previous);const card=eligible[(next+1)%eligible.length];index=cards.indexOf(card);cards.forEach(item=>item.classList.toggle('is-idle',item===card));progress?.classList.add('is-visible');dots.forEach((dot,i)=>dot.classList.toggle('is-current',i===index));timer=setTimeout(step,11500)}
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target));schedule()},{threshold:.15});cards.forEach(card=>observer.observe(card));
 ['scroll','wheel','touchstart','pointerdown','keydown'].forEach(type=>window.addEventListener(type,()=>schedule(),{passive:true}));
 cards.forEach(card=>{card.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovering=true;clear();if(!motion.matches)card.classList.add('is-alt')}});card.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'){hovering=false;if(!card.open||matchMedia('(min-width: 1024px)').matches)card.classList.remove('is-alt');schedule()}})});
 cards.forEach(card=>card.addEventListener('toggle',()=>{if(!matchMedia('(min-width: 1024px)').matches)card.classList.toggle('is-alt',card.open&&!motion.matches)}));
 section.addEventListener('focusin',clear);section.addEventListener('focusout',()=>setTimeout(()=>schedule(),0));motion.addEventListener('change',()=>{if(motion.matches)cards.forEach(card=>card.classList.remove('is-alt'));schedule()});document.addEventListener('visibilitychange',()=>schedule());
})();
