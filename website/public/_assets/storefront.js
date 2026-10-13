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

/* القوائم المنسدلة على سطح المكتب: ضغط/لمس للفتح، تمرير الفأرة، Escape، والضغط خارجها */
const dropdowns = [...document.querySelectorAll('.sm-dd')];
let ddTimer;
function setDropdown(dd, open) {
  dd.classList.toggle('open', open);
  dd.querySelector('.sm-dd-btn')?.setAttribute('aria-expanded', String(open));
}
function closeDropdowns(except) { dropdowns.forEach(dd => { if (dd !== except) setDropdown(dd, false); }); }
dropdowns.forEach(dd => {
  const btn = dd.querySelector('.sm-dd-btn');
  /* الفأرة تفتح القائمة بالتمرير أصلاً، فضغطتها تُبقيها مفتوحة بدل أن تغلقها؛
     اللمس ولوحة المفاتيح يبدّلان الحالة */
  let lastPointer = '';
  btn?.addEventListener('pointerdown', e => { lastPointer = e.pointerType; });
  btn?.addEventListener('click', e => {
    const open = (e.detail > 0 && lastPointer === 'mouse') || !dd.classList.contains('open');
    lastPointer = '';
    closeDropdowns(dd); setDropdown(dd, open);
  });
  dd.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; clearTimeout(ddTimer); closeDropdowns(dd); setDropdown(dd, true); });
  dd.addEventListener('pointerleave', e => { if (e.pointerType !== 'mouse') return; clearTimeout(ddTimer); ddTimer = setTimeout(() => setDropdown(dd, false), 140); });
  dd.addEventListener('focusout', e => { if (!dd.contains(e.relatedTarget)) setDropdown(dd, false); });
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const open = dropdowns.find(dd => dd.classList.contains('open'));
  if (open) { setDropdown(open, false); open.querySelector('.sm-dd-btn')?.focus(); }
});
document.addEventListener('click', e => { if (!e.target.closest('.sm-dd')) closeDropdowns(); });

/* تمييز مجموعة الصفحة الحالية، وفتحها في قائمة الجوال */
(() => {
  let first = '';
  try { first = decodeURI(location.pathname).replace(/^\/+/, '').split('/')[0]; } catch { /* ignore */ }
  document.querySelectorAll('.sm-dd[data-match], .sm-acc[data-match]').forEach(el => {
    const match = (el.getAttribute('data-match') || '').split(' ');
    if (!match.includes(first)) return;
    el.classList.add('is-active');
    if (el.tagName === 'DETAILS') el.open = true;
  });
})();
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
