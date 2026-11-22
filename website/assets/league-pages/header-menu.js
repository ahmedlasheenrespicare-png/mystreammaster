(() => {
  const panel = document.getElementById('league-header-panel');
  const triggers = [...document.querySelectorAll('[data-league-menu-trigger]')];
  if (!panel || !triggers.length) return;
  let active = null;
  function position() {
    if (!active || panel.hidden || innerWidth <= 600) return;
    const rect = active.getBoundingClientRect();
    const width = Math.min(620, innerWidth - 32);
    panel.style.left = `${Math.max(16, Math.min(innerWidth - width - 16, rect.left + rect.width / 2 - width / 2))}px`;
    panel.style.top = `${Math.max(12, Math.min(innerHeight - 100, rect.bottom + 12))}px`;
    panel.style.maxHeight = `${Math.max(120, innerHeight - parseFloat(panel.style.top) - 16)}px`;
  }
  function close(restore = false) {
    panel.hidden = true;
    triggers.forEach(button => button.setAttribute('aria-expanded', 'false'));
    if (restore && active) active.focus();
    active = null;
  }
  triggers.forEach(button => button.addEventListener('click', () => {
    if (!panel.hidden && active === button) { close(); return; }
    active = button;
    triggers.forEach(item => item.setAttribute('aria-expanded', String(item === button)));
    panel.hidden = false;
    position();
    panel.querySelector('.league-menu-close').focus({ preventScroll: true });
  }));
  panel.querySelector('.league-menu-close').addEventListener('click', () => close(true));
  document.addEventListener('click', event => {
    if (!panel.hidden && !panel.contains(event.target) && !triggers.some(button => button.contains(event.target))) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); event.stopImmediatePropagation(); close(true); }
  }, true);
  addEventListener('resize', () => { if (innerWidth <= 600) panel.style.maxHeight = ''; position(); });
  addEventListener('scroll', () => { if (!panel.hidden && active && !active.closest('.nav__menu')) close(); }, { passive: true });
})();
