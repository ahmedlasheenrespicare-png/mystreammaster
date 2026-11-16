/* Animate canonical provider figures once visible; expose only final numbers to AT. */
(function(){
 const motion=window.smMotion;
 if(!motion || !('IntersectionObserver' in window) || !window.requestAnimationFrame)return;
 const format=new Intl.NumberFormat('en-US');
 const entries=[...document.querySelectorAll('.sm-servers .sm-server__count')].map(node=>{
  const final=node.textContent.trim();
  if(!/^\+?\d[\d,]*$/.test(final))return null;
  const value=Number(final.replace(/[^\d]/g,''));
  return Number.isSafeInteger(value) ? {node,final,value,prefix:final.startsWith('+')?'+':'',visible:false,done:false,frame:0} : null;
 }).filter(Boolean);
 function stop(item){if(item.frame)cancelAnimationFrame(item.frame);item.frame=0;item.node.textContent=item.final}
 function start(item){
  if(motion.matches||!item.visible||item.done||item.frame)return;
  const started=performance.now(),duration=1200;
  item.node.textContent=item.prefix+'0';
  function tick(now){
   if(motion.matches){stop(item);return}
   const t=Math.min(1,(now-started)/duration),eased=1-Math.pow(1-t,3);
   item.node.textContent=item.prefix+format.format(Math.round(item.value*eased));
   if(t<1)item.frame=requestAnimationFrame(tick);else{item.frame=0;item.done=true;item.node.textContent=item.final}
  }
  item.frame=requestAnimationFrame(tick);
 }
 const byNode=new Map(entries.map(item=>[item.node,item]));
 const observer=new IntersectionObserver(changes=>changes.forEach(change=>{
  const item=byNode.get(change.target);if(!item)return;
  item.visible=change.isIntersecting;
  if(item.visible)start(item);else if(item.frame)stop(item);
 }),{threshold:.25});
 entries.forEach(item=>observer.observe(item.node));
 motion.addEventListener('change',()=>{
  if(motion.matches)entries.forEach(stop);
  else entries.forEach(start);
 });
})();
