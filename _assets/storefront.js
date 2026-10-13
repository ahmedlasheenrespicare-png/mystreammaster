const toggle = document.querySelector('.sm-menu-toggle');
const menu = document.getElementById('sm-mobile-nav');
function closeMenu() {
  if (!menu || !toggle) return;
  menu.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'فتح القائمة');
}
toggle?.addEventListener('click', () => {
  menu.hidden = !menu.hidden;
  toggle.setAttribute('aria-expanded', String(!menu.hidden));
  toggle.setAttribute('aria-label', menu.hidden ? 'فتح القائمة' : 'إغلاق القائمة');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menu && !menu.hidden) { closeMenu(); toggle.focus(); }
});
document.addEventListener('click', e => { if (!e.target.closest('.sm-header')) closeMenu(); });
menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
function updateCart() {
  try {
    const items = JSON.parse(localStorage.getItem('stream-master-cart') || '[]');
    const count = Array.isArray(items) ? items.reduce((n, item) => n + (Number(item.quantity) || 1), 0) : 0;
    document.querySelectorAll('[data-sm-cart-count]').forEach(el => { el.textContent = String(count); });
  } catch { /* Storage unavailable; leave the default count. */ }
}
updateCart();
window.addEventListener('storage', updateCart);
window.addEventListener('cart-updated', updateCart);
