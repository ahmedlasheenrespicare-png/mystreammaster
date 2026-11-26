(() => {
  const base = new URL('.', document.currentScript.src);
  const section = document.querySelector('#works');
  if (!section || !section.querySelector('.preview')) return;
  const cards = [...section.querySelectorAll('.league-carousel-item')];
  let sectionVisible = !('IntersectionObserver' in window);
  const activeStates = new WeakMap();
  function loadVisible() {
    for (const card of cards) {
      const code = ({0:'nova',3:'x'})[card.dataset.index];
      if (!code) continue;
      const active = sectionVisible && card.dataset.ringPos === 'front';
      let iframe = card.querySelector('.preview-3d');
      if (active && !iframe) {
        iframe = document.createElement('iframe');
        iframe.className = 'preview-3d'; iframe.title = `مجسّم شعار ${code === 'nova' ? 'نوفا' : 'X'}`;
        iframe.tabIndex = -1; iframe.setAttribute('aria-hidden','true');
        iframe.src = new URL(`card.html?logo=${code}&card=1`, base).href;
        card.querySelector('.lc-stage').append(iframe);
      }
      if (iframe && activeStates.get(card) !== active) {
        activeStates.set(card, active);
        iframe.contentWindow?.postMessage({type:'server-card-active',active}, location.origin);
      }
    }
  }
  const mutation = new MutationObserver(loadVisible);
  for (const card of cards) mutation.observe(card, {attributes:true,attributeFilter:['data-ring-pos']});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {sectionVisible = entries[0].isIntersecting; loadVisible();}, {rootMargin:'200px'}).observe(section.querySelector('.preview'));
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.data?.type !== 'server-card-ready') return;
    const index = event.data.server === 'nova' ? 0 : event.data.server === 'x' ? 3 : -1;
    const card = cards.find(item => Number(item.dataset.index) === index);
    const iframe = card?.querySelector('.preview-3d');
    if (iframe && event.source === iframe.contentWindow) {
      const stage = iframe.closest('.lc-stage');
      stage.classList.add('has-3d');
      stage.dataset.model = event.data.server;
      iframe.contentWindow?.postMessage({type:'server-card-active',active:sectionVisible && card.dataset.ringPos === 'front'}, location.origin);
    }
  });
  loadVisible();
})();
