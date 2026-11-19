/* Four reference-inspired steps driven by native scroll, without idle loops. */
(()=>{
 const section=document.querySelector('.steps'),items=[...document.querySelectorAll('.steps__item')],dots=[...document.querySelectorAll('.steps__dots i')],view=section?.querySelector('.steps__view'),footerAccent=section?.querySelector('.steps__footer>span:first-child'),backgrounds=[...document.querySelectorAll('.steps__scene')],shapes=[...document.querySelectorAll('.steps__scene img')],counter=document.querySelector('.steps__counter'),motion=window.smMotion;
 if(!section||items.length!==4||!motion)return;
 let visible=false,frame=0,current=-1;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),cubic=n=>n<.5?4*n*n*n:1-Math.pow(-2*n+2,3)/2,sine=n=>(1-Math.cos(Math.PI*n))/2;
 function reset(){if(frame)cancelAnimationFrame(frame);frame=0;section.classList.remove('is-enhanced');view?.style.removeProperty('transform');footerAccent?.style.removeProperty('--sm-accent-y');items.forEach(item=>{delete item.dataset.current;item.querySelectorAll('.steps__body,.steps__body>*').forEach(el=>{el.style.removeProperty('opacity');el.style.removeProperty('transform')});item.querySelector('a')?.removeAttribute('tabindex')});dots.forEach(dot=>dot.classList.remove('is-current'));backgrounds.forEach(scene=>scene.style.removeProperty('opacity'));shapes.forEach(shape=>shape.style.removeProperty('transform'));current=-1}
 function update(){
  frame=0;if(!visible||document.hidden||motion.matches)return;
  const rect=section.getBoundingClientRect(),travel=Math.max(1,section.offsetHeight-innerHeight);
  view.style.transform=`translate3d(0,${clamp(-rect.top,0,travel).toFixed(1)}px,0)`;
  const value=(-rect.top+innerHeight/2)/(travel/items.length),whole=Math.floor(value);
  const raw=clamp(value,0,items.length+1),eased=clamp(whole+cubic(value-whole),0,items.length+1);
  if(footerAccent)footerAccent.style.setProperty('--sm-accent-y',`${(Math.sin(raw*Math.PI/2)*14).toFixed(1)}px`);
  let best=0,top=-1;
  items.forEach((item,i)=>{
   const position=clamp(.5*raw-.5*i,0,1),phase=clamp(.5*eased-.5*i,0,1),wave=1-(.5*Math.cos(phase*Math.PI*2)+.5),alpha=sine(wave);
   item.querySelector('.steps__body').style.transform=`translate3d(0,${100-200*position}px,0)`;
   const heading=item.querySelector('h2'),number=item.querySelector('.steps__number'),details=item.querySelector('.steps__details');
   heading.style.opacity=alpha.toFixed(4);heading.style.transform=`translate3d(0,${(i+1)*50-50*eased}%,0) scale(${.8+.2*wave})`;
   number.style.opacity=alpha.toFixed(4);number.style.transform=`translate3d(0,${(i+1)*30-30*eased}%,0)`;
   details.style.opacity=cubic(clamp((wave-.18)/.82,0,1)).toFixed(4);details.style.transform=`translate3d(0,${-50+100*phase}%,0) scale(${.7+.3*wave})`;
   if(backgrounds[i])backgrounds[i].style.opacity=alpha.toFixed(4);
   // Only the transparent object moves; the gradient behind it stays still.
   if(shapes[i]&&alpha>.0001){const drift=(.5-position)*60,angle=(position-.5)*18;shapes[i].style.transform=`translate3d(0,${drift.toFixed(1)}px,0) rotate(${angle.toFixed(1)}deg)`}
   if(alpha>top){top=alpha;best=i}
  });
  if(best!==current){current=best;items.forEach((item,i)=>{item.dataset.current=String(i===current);const a=item.querySelector('a');if(a&&a!==document.activeElement)a.tabIndex=i===current?0:-1});dots.forEach((dot,i)=>dot.classList.toggle('is-current',i===current));counter.textContent=['٠١ / ٠٤','٠٢ / ٠٤','٠٣ / ٠٤','٠٤ / ٠٤'][current]}
 }
 function schedule(){if(visible&&!document.hidden&&!motion.matches&&section.classList.contains('is-enhanced')&&!frame)frame=requestAnimationFrame(update)}
 function configure(){if(motion.matches){reset();return}section.classList.add('is-enhanced');schedule()}
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(!visible&&frame){cancelAnimationFrame(frame);frame=0}schedule()},{rootMargin:'100px'}).observe(section);else visible=true;
 // Earlier sections can reflow after fonts or async content load without a scroll event.
 // Recompute the pinned position when that changes the document's layout.
 if('ResizeObserver' in window){const layoutObserver=new ResizeObserver(schedule);[document.body,document.querySelector('#works'),document.querySelector('.steps-intro')].filter(Boolean).forEach(el=>layoutObserver.observe(el))}
 addEventListener('scroll',schedule,{passive:true});addEventListener('sm-smooth-scroll',schedule);addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);motion.addEventListener('change',configure);configure();
})();
