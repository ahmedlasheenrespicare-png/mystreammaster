/* Recognise horizontal gestures over the whole display, without blocking vertical scroll. */
window.smDisplaySwipe = function(area, onStep) {
 let touchStart=null,mouseStart=null,suppressClickUntil=0;
 function finish(start,x,y){
  if(!start)return;const dx=x-start.x,dy=y-start.y;
  if(Math.abs(dx)>=35&&Math.abs(dx)>Math.abs(dy)*1.25){suppressClickUntil=Date.now()+700;onStep(dx<0?1:-1)}
 }
 area.addEventListener('touchstart',event=>{
  if(event.touches.length!==1){touchStart=null;return}
  const point=event.touches[0];touchStart={x:point.clientX,y:point.clientY,id:point.identifier};
 },{passive:true});
 area.addEventListener('touchend',event=>{
  if(!touchStart)return;const point=[...event.changedTouches].find(t=>t.identifier===touchStart.id);if(point)finish(touchStart,point.clientX,point.clientY);touchStart=null;
 },{passive:true});
 area.addEventListener('touchcancel',()=>{touchStart=null},{passive:true});
 area.addEventListener('mousedown',event=>{if(event.button===0)mouseStart={x:event.clientX,y:event.clientY}});
 window.addEventListener('mouseup',event=>{if(mouseStart){finish(mouseStart,event.clientX,event.clientY);mouseStart=null}});
 window.addEventListener('blur',()=>{mouseStart=null;touchStart=null});
 area.addEventListener('dragstart',event=>event.preventDefault());
 area.addEventListener('click',event=>{if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation()}},true);
};
