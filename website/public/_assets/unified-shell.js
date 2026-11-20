/* Interaction for static legacy documents; React pages use component handlers. */
(() => {
  const root = document.querySelector('[data-unified-shell]');
  if (!root) return;
  const toggle = root.querySelector('.us-menu-toggle');
  const menu = root.querySelector('.us-menu');
  const currency = root.querySelector('.us-currency');
  const cart = root.querySelector('.us-cart');
  if (!toggle || !menu || !currency || !cart) return;
  function setMenu(open) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
  }
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  root.querySelector('.us-menu-backdrop')?.addEventListener('click', () => setMenu(false));
  menu.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });
  cart.addEventListener('click', () => { location.href = '/cart/'; });
  try { const stored = localStorage.getItem('sm-reference-currency'); if ([...currency.options].some(option => option.value === stored)) currency.value = stored; } catch { /* Storage may be disabled. */ }
  currency.addEventListener('change', () => { try { localStorage.setItem('sm-reference-currency', currency.value); localStorage.setItem('stream-master-currency', currency.value); window.dispatchEvent(new CustomEvent('currency-changed', {detail: currency.value})); } catch { /* Use this session only. */ } });
  function updateCart() {
    try {
      const items = JSON.parse(localStorage.getItem('stream-master-cart') || '[]');
      const count = Array.isArray(items) ? items.reduce((sum, item) => sum + Math.min(20, Math.max(1, Number(item.quantity) || 1)), 0) : 0;
      root.querySelector('[data-us-cart-count]').textContent = String(count);
    } catch { /* Leave the visible default. */ }
  }
  updateCart(); window.addEventListener('storage', updateCart); window.addEventListener('cart-updated', updateCart);
  const motion = document.querySelector('.us-motion select');
  const syncMotion = () => { let value = 'on'; try { const saved = localStorage.getItem('sm-motion-preference'); if (['on', 'off', 'auto'].includes(saved)) value = saved; } catch { /* Storage may be disabled. */ } document.documentElement.dataset.motion = value; if (motion) motion.value = value; };
  syncMotion(); window.addEventListener('storage', syncMotion);
  motion?.addEventListener('change', () => { document.documentElement.dataset.motion = motion.value; try { localStorage.setItem('sm-motion-preference', motion.value); } catch { /* Use this session only. */ } window.dispatchEvent(new Event('sm-motion-change')); });
  const scene = document.querySelector('.us-contact-scene');
  if (scene) {
    let near = true, frame = 0;
    const update = () => { frame = 0; const p = Math.max(0, Math.min(1, (innerHeight * .9 - scene.getBoundingClientRect().top) / (innerHeight * .45))); const eased = 1 - Math.pow(1 - p, 3); scene.style.setProperty('--us-brand-rise', `${(1-eased)*70}px`); scene.style.setProperty('--us-brand-opacity', String(.03+eased*.2)); };
    const schedule = () => { if (near && !document.hidden && !frame) frame = requestAnimationFrame(update); };
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { near = entries[0].isIntersecting; scene.classList.toggle('us-offscreen', !near); schedule(); }, {rootMargin:'100px'}).observe(scene);
    window.addEventListener('scroll', schedule, {passive:true}); window.addEventListener('resize', schedule); schedule();
  }
  const nav = document.querySelector('.us-footer-nav');
  if (nav) {
    let near = true, frame = 0;
    const reduced = () => document.documentElement.dataset.motion === 'off' || (document.documentElement.dataset.motion !== 'on' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const clamp = n => Math.max(0, Math.min(1, n));
    const update = () => { frame = 0; const r = nav.getBoundingClientRect(); const overall = reduced() ? 1 : Math.min(clamp((innerHeight * 1.12 - r.top) / (innerHeight * .84)), clamp(r.bottom / (innerHeight * .18))); [...nav.children].forEach((entry, index) => { const p = reduced() ? 1 : clamp((overall - index * .04) / .8), eased = 1 - Math.pow(1 - p, 3); entry.style.setProperty('--us-entry-y', `${(1-eased)*70}px`); entry.style.setProperty('--us-entry-opacity', String(eased)); }); };
    const schedule = () => { if (near && !document.hidden && !frame) frame = requestAnimationFrame(update); };
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { near = entries[0].isIntersecting; schedule(); }, {rootMargin:'300px'}).observe(nav);
    window.addEventListener('scroll', schedule, {passive:true}); window.addEventListener('resize', schedule); document.addEventListener('visibilitychange', schedule); window.addEventListener('sm-motion-change', () => { if (!frame) frame = requestAnimationFrame(update); }); window.addEventListener('storage', () => { if (!frame) frame = requestAnimationFrame(update); }); schedule();
  }
  const top = document.createElement('button'); top.type = 'button'; top.className = 'us-top'; top.textContent = '↑'; top.setAttribute('aria-label', 'الرجوع للأعلى'); top.hidden = true; document.body.append(top);
  top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  let previous = window.scrollY;
  const scroll = () => { const y = window.scrollY, delta = y - previous; top.hidden = y <= 400; if (y < 80 || !menu.hidden) root.classList.remove('us-scrolled-away'); else if (Math.abs(delta) >= 5) root.classList.toggle('us-scrolled-away', delta > 0); if (Math.abs(delta) >= 5 || y < 80) previous = y; };
  window.addEventListener('scroll', scroll, { passive: true }); scroll();
})();
