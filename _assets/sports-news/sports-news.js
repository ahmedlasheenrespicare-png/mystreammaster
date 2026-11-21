(() => {
  const section = document.querySelector('#sports-news');
  if (!section) return;
  const dataUrl = new URL('sports-news.json?v=13', document.currentScript.src);
  const rail = section.querySelector('.sm-news__rail');
  const status = section.querySelector('.sm-news__status');
  const bottom = section.querySelector('.sm-news__bottom');
  const months = { يناير: 1, فبراير: 2, مارس: 3, أبريل: 4, ابريل: 4, مايو: 5, يونيو: 6, يوليو: 7, أغسطس: 8, اغسطس: 8, سبتمبر: 9, أكتوبر: 10, نوفمبر: 11, ديسمبر: 12 };
  const dayMs = 86400000;
  function storyDay(label) {
    const match = /^(\d{1,2})\s+(\S+)\s+(\d{4})$/.exec(label || '');
    if (!match || !months[match[2]]) return null;
    const year = Number(match[3]), month = months[match[2]], day = Number(match[1]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.getTime() : null;
  }
  function cairoToday() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = name => Number(parts.find(item => item.type === name).value);
    return Date.UTC(part('year'), part('month') - 1, part('day'));
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function createTicket(item, today) {
    const link = element('a', 'sm-news__ticket' + (!item.images?.length ? ' sm-news__ticket--no-image' : ''));
    link.href = '/' + item.href;
    link.setAttribute('aria-label', `اقرأ الخبر: ${item.title}`);
    const published = storyDay(item.dateLabel);
    const age = published === null ? null : (today - published) / dayMs;
    const label = age === null ? 'تاريخ غير متاح' : age < 0 ? 'تاريخ مستقبلي' : '';
    const date = element('span', 'sm-news__date');
    date.append(element('time', '', item.dateLabel || 'بلا تاريخ'));
    if (label) date.append(element('small', 'sm-news__age', label));
    link.append(element('span', 'sm-news__ribbon', item.category), date);
    if (item.images?.length) {
      const visual = element('div', 'sm-news__visual' + (item.images.length > 1 ? ' sm-news__visual--multi' : ''));
      item.images.forEach(({ src }) => {
        if (typeof src !== 'string' || !(/^(?:images|home-preview\/saved-reference\/images)\/[a-zA-Z0-9_./-]+$/.test(src)) || src.includes('..')) return;
        const image = document.createElement('img');
        image.src = '/' + src;
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        visual.append(image);
      });
      link.append(visual);
    }
    const text = element('div', 'sm-news__text');
    text.append(element('strong', '', item.title), element('p', '', item.description));
    link.append(text);
    const footer = element('div', 'sm-news__ticket-bottom');
    footer.append(element('span', '', 'اقرأ الخبر'), element('b', '', '↗'));
    link.append(footer);
    return link;
  }
  async function render() {
    try {
      const response = await fetch(dataUrl);
      if (!response.ok) throw new Error('News data unavailable');
      const data = await response.json();
      const today = cairoToday();
      const items = data.filter(item => item && typeof item.title === 'string' && typeof item.href === 'string' && /^news\/[a-z0-9-]+\/$/.test(item.href))
        .sort((a, b) => (storyDay(b.dateLabel) ?? -Infinity) - (storyDay(a.dateLabel) ?? -Infinity));
      if (!items.length) { status.textContent = 'لا توجد أخبار متاحة حاليًا.'; return; }
      status.textContent = '';
      rail.replaceChildren(...items.map(item => createTicket(item, today)));
      bottom.hidden = items.length < 2;
    } catch {
      status.textContent = 'تعذّر تحميل الأخبار حاليًا. حاول مجددًا لاحقًا.';
    }
  }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let hovering = false, interacting = false, visible = false;
  let lastInteraction = 0;
  function step(direction, wrap = false) {
    const card = rail.querySelector('.sm-news__ticket');
    if (!card) return;
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    const distance = card.getBoundingClientRect().width + gap;
    const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
    if (!max) return;
    const target = wrap && -rail.scrollLeft >= max - 2 ? 0 : rail.scrollLeft + direction * distance;
    rail.scrollTo({ left: target, behavior: motion.matches ? 'auto' : 'smooth' });
  }
  section.querySelectorAll('[data-news-direction]').forEach(button => button.addEventListener('click', () => {
    lastInteraction = Date.now();
    step(button.dataset.newsDirection === 'next' ? -1 : 1);
  }));
  section.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovering = true; });
  section.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') hovering = false; });
  rail.addEventListener('pointerdown', () => { interacting = true; lastInteraction = Date.now(); });
  window.addEventListener('pointerup', () => { if (interacting) lastInteraction = Date.now(); interacting = false; });
  rail.addEventListener('wheel', () => { lastInteraction = Date.now(); }, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: 0.15 }).observe(section);
  } else visible = true;
  setInterval(() => {
    if (!hovering && !interacting && visible && !document.hidden && !motion.matches && !section.contains(document.activeElement) && Date.now() - lastInteraction > 8000) step(-1, true);
  }, 5000);
  render();
})();
