/* Desktop shows all three paths; mobile uses native grouped accordions. */
(function(){
 const cards=[...document.querySelectorAll('.sm-path__card')];if(!cards.length)return;
 const desktop=matchMedia('(min-width: 1024px)');
 function layout(){cards.forEach(card=>{if(desktop.matches){card.removeAttribute('name');card.open=true}else{card.open=false;card.name='sm-path-options'}})}
 desktop.addEventListener?.('change',layout);layout();
 if(!('IntersectionObserver' in window))return;
 const items=[document.querySelector('.sm-path__heading h2'),document.querySelector('.sm-path__intro > div'),document.querySelector('.sm-path__trial'),...cards].filter(Boolean),seen=new WeakSet();
 const observer=new IntersectionObserver(entries=>{entries.forEach(({target,isIntersecting})=>{if(isIntersecting){if(target.matches('h2'))target.closest('.sm-path__heading').classList.add('is-visible');seen.add(target);target.classList.remove('sm-path-pending');observer.unobserve(target)}})},{threshold:.1});
 function sync(){items.forEach(item=>item.classList.toggle('sm-path-pending',!window.smMotion.matches&&!seen.has(item)))}
 items.forEach(item=>item.addEventListener('focusin',()=>{seen.add(item);item.classList.remove('sm-path-pending');observer.unobserve(item)}));
 sync();items.forEach(item=>observer.observe(item));window.smMotion.addEventListener('change',sync);
})();
