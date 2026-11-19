(()=>{
 const launch=document.querySelector('.world-launch'),world=document.getElementById('explore-world'),section=document.getElementById('league-strip');
 if(!launch||!world||!section)return;
 let beforeOverflow='',returnFocus=launch;
 function open(index=null,view=null,trigger=launch){
  beforeOverflow=document.documentElement.style.overflow;returnFocus=trigger;document.documentElement.style.overflow='hidden';
  const url=new URL('/home-preview/saved-reference/assets/league-world/world.html?v=4095aca42404c097',location.origin);
  if(Number.isInteger(index)&&index>=0&&index<8&&['standings','rates','matches'].includes(view)){url.searchParams.set('league',index);url.searchParams.set('view',view)}
  world.src=url.pathname+url.search;world.hidden=false;
 }
 function finish(){if(world.hidden)return;world.hidden=true;world.src='about:blank';document.documentElement.style.overflow=beforeOverflow;const focusTarget=returnFocus?.matches('.sm-leagues__actions button[data-view]')?section.querySelector('.league-fixed-actions button[data-view="'+returnFocus.dataset.view+'"]'):returnFocus;if(focusTarget?.isConnected)focusTarget.focus({preventScroll:true})}
 launch.addEventListener('click',()=>open());
 section.addEventListener('click',event=>{const button=event.target.closest('.sm-leagues__actions button[data-view]');if(!button)return;const card=button.closest('.sm-leagues__card'),index=[...section.querySelectorAll('.sm-leagues__card')].indexOf(card);if(index<0||!['standings','rates','matches'].includes(button.dataset.view))return;event.preventDefault();event.stopImmediatePropagation();open(index,button.dataset.view,button)},true);
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===world.contentWindow&&e.data?.type==='kota-return')finish()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!world.hidden)finish()});
})();
