/* Self-contained panning, input and card selection for the independent preview. */
(()=>{
 const world=document.querySelector('.world'),plane=world.querySelector('.cards');
 const cards=[...plane.querySelectorAll(':scope > .card')],shapes=[...plane.querySelectorAll('.shape')];
 const reduced=window.smMotion||matchMedia('(prefers-reduced-motion: reduce)');
 const engine={overlayOpen:false,stopScroll:false};let x=0,y=0,targetX=0,targetY=0,minX=0,minY=0,frame=0,drag=null,lastTime=0,lastInput=performance.now(),selectedCard=null,flipTimer=0,focusTimer=0;
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 function layout(){
  const w=innerWidth,h=innerHeight,mobile=w<=750,cw=mobile?216:clamp(w*.205,220,290),ch=cw*1.547;
  const step=mobile?Math.max(310,w*.82):Math.max(cw+130,w*.36),rowGap=mobile?120:130,startX=mobile?26:4,startY=mobile?Math.min(98,h*.14):Math.min(181,h*.215);
  const offsets=mobile?[0,-65,0,-48,0,-65,32,-32]:[0,-200,0,-150,0,-200,100,-100];
  let right=0,bottom=0;
  cards.forEach((card,i)=>{let col=i%4,row=Math.floor(i/4),left=startX+col*step+(row?(mobile?32:100):0),top=startY+row*(ch+rowGap)+offsets[i];
   card.style.setProperty('--width',cw+'px');card.style.setProperty('--height',ch+'px');card.style.setProperty('--card-x',left+'px');card.style.setProperty('--card-y',top+'px');right=Math.max(right,left+cw);bottom=Math.max(bottom,top+ch);
  });
  shapes.forEach((shape,i)=>{const col=i%4,row=Math.floor(i/4);shape.style.left=(startX+col*step+(row%2?step*.4:step*.1))+'px';shape.style.top=(startY+row*(ch*.55)+((i%3)-1)*70)+'px';shape.style.width=(i%3===0?48:32)+'px';shape.style.height=shape.style.width});
  minX=Math.min(0,w-right-36);minY=Math.min(0,h-bottom-36);targetX=clamp(targetX,minX,0);targetY=clamp(targetY,minY,0);x=clamp(x,minX,0);y=clamp(y,minY,0);render();
 }
 function render(){plane.style.setProperty('--pan-x',x.toFixed(2)+'px');plane.style.setProperty('--pan-y',y.toFixed(2)+'px')}
 function tick(t){frame=0;if(!engine.overlayOpen&&!engine.stopScroll){const elapsed=Math.min(40,t-(lastTime||t));if(!reduced.matches&&!drag&&!plane.querySelector('.card.is-flipped')&&t-lastInput>2500){targetX=clamp(targetX-elapsed*.004,minX,0)}const ease=reduced.matches?1:.15;x+=(targetX-x)*ease;y+=(targetY-y)*ease;render()}lastTime=t;frame=requestAnimationFrame(tick)}
 function move(dx,dy){if(selectedCard)return;targetX=clamp(targetX+dx,minX,0);targetY=clamp(targetY+dy,minY,0);lastInput=performance.now();if(reduced.matches){x=targetX;y=targetY;render()}}
 world.addEventListener('wheel',e=>{if(engine.overlayOpen||engine.stopScroll)return;e.preventDefault();const dx=e.deltaX||e.deltaY*.85,dy=e.deltaY*.48;move(-dx,-dy)},{passive:false});
 world.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||drag||engine.overlayOpen)return;const card=e.target.closest('.cards > .card');if(!card)return;const r=card.getBoundingClientRect();card.style.setProperty('--x',clamp((e.clientX-r.left-r.width/2)/r.width,-.5,.5));card.style.setProperty('--y',clamp((e.clientY-r.top-r.height/2)/r.height,-.5,.5))});
 cards.forEach(card=>card.addEventListener('pointerleave',()=>{card.style.setProperty('--x','0');card.style.setProperty('--y','0')}));
 world.addEventListener('pointerdown',e=>{if(engine.overlayOpen||selectedCard||e.button!==0||e.target.closest('.go-back'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};window.__worldDidDrag=false});
 world.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||engine.overlayOpen)return;const distance=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY);if(distance>10){drag.moved=true;window.__worldDidDrag=true;world.classList.add('is-dragging');if(!world.hasPointerCapture(e.pointerId))world.setPointerCapture(e.pointerId)}if(drag.moved){move(e.clientX-drag.x,e.clientY-drag.y)}drag.x=e.clientX;drag.y=e.clientY});
 function finish(e){if(!drag||e.pointerId!==drag.id)return;let moved=drag.moved;drag=null;world.classList.remove('is-dragging');if(moved)setTimeout(()=>{window.__worldDidDrag=false},0)}
 world.addEventListener('pointerup',finish);world.addEventListener('pointercancel',finish);
 function center(card){
  const r=card.getBoundingClientRect();
  const width=parseFloat(card.style.getPropertyValue('--width')),height=parseFloat(card.style.getPropertyValue('--height'));
  card.style.setProperty('--selected-scale',Math.max(1,Math.min(1.3,(innerWidth-32)/width,(innerHeight-80)/height)));
  const oldX=parseFloat(card.style.getPropertyValue('--center-x'))||0,oldY=parseFloat(card.style.getPropertyValue('--center-y'))||0;
  card.style.setProperty('--center-x',(oldX+innerWidth/2-(r.left+r.width/2))+'px');
  card.style.setProperty('--center-y',(oldY+innerHeight/2-(r.top+r.height/2))+'px');
 }
 function flip(card,back,focus=true){
  clearTimeout(flipTimer);clearTimeout(focusTimer);
  const front=card.querySelector('.card-values__inner'),reverse=card.querySelector('.back'),button=front.querySelector('.explore-button');
  if(back){
   selectedCard=card;targetX=x;targetY=y;card.style.setProperty('--x','0');card.style.setProperty('--y','0');
   center(card);card.classList.add('is-centered');world.classList.add('has-centered-card');
   window.refreshLeagueCard?.(Number(card.dataset.id));
   flipTimer=setTimeout(()=>{if(selectedCard!==card)return;card.classList.add('is-flipped');front.inert=true;reverse.inert=false;button.setAttribute('aria-expanded','true');if(focus)focusTimer=setTimeout(()=>{if(selectedCard===card&&card.classList.contains('is-flipped'))reverse.querySelector('.card-open-details').focus({preventScroll:true})},reduced.matches?0:400)},reduced.matches?0:520);
  }else{
   card.classList.remove('is-flipped');front.inert=false;reverse.inert=true;button.setAttribute('aria-expanded','false');
   flipTimer=setTimeout(()=>{card.classList.remove('is-centered');card.style.removeProperty('--center-x');card.style.removeProperty('--center-y');card.style.removeProperty('--selected-scale');world.classList.remove('has-centered-card');selectedCard=null;lastInput=performance.now();if(focus)button.focus({preventScroll:true})},reduced.matches?0:350);
  }
  lastInput=performance.now();
 }
 world.addEventListener('click',e=>{if(engine.overlayOpen||window.__worldDidDrag)return;const card=e.target.closest('.cards > .card');if(!card||selectedCard&&card!==selectedCard)return;if(e.target.closest('.card-open-details')){window.openLeagueOverlay(card,engine);return}if(selectedCard){flip(card,false);return}flip(card,true)});
 world.addEventListener('focusin',e=>{if(engine.overlayOpen||selectedCard)return;const card=e.target.closest('.cards > .card');if(!card)return;const r=card.getBoundingClientRect();let dx=r.left<12?12-r.left:r.right>innerWidth-12?innerWidth-12-r.right:0,dy=r.top<12?12-r.top:r.bottom>innerHeight-12?innerHeight-12-r.bottom:0;if(dx||dy)move(dx,dy)});
 window.addEventListener('keydown',e=>{if(engine.overlayOpen||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();move(e.key==='ArrowLeft'?130:e.key==='ArrowRight'?-130:0,e.key==='ArrowUp'?130:e.key==='ArrowDown'?-130:0)});
 window.addEventListener('resize',()=>{layout();if(selectedCard)center(selectedCard)});layout();frame=requestAnimationFrame(tick);
 window.__kotaLeagueEngine=engine;window.dispatchEvent(new Event('kota-league-engine-ready'));
})();
