/* Move each whole section in and out without changing its layout or opacity. */
(() => {
  const selectors = ['#about', '#services', '#league-strip', '#featured-matches', '#sports-news', '#cinema-library', '#path-section', '#works', '#journey', '#steps-stage', '#reviews', '#faq', '#m3u-player', '#blog-teaser', '.sm-contact'];
  const sections = selectors.map(selector => document.querySelector(selector)).filter(Boolean);
  // A stationary colour bed follows the sections' original layout. It fills
  // the space exposed by their translations without moving their contents.
  const canvas = document.querySelector('#smooth-content');
  const colours = ['#280822', '#ffffff', '#efcc92', '#ffffff', '#f7f1e7', '#e0caca', '#ffffff', '#f7f7f7', '#fcfaf6', '#fcfaf6', '#faf9f6', '#f2f2f2', '#e3d0cf', '#efcc92', '#280822'];
  let backdropFrame = 0;
  function paintBackdrop() {
    backdropFrame = 0;
    if (!canvas) return;
    const origin = canvas.getBoundingClientRect().top;
    const stops = ['#101922 0px'];
    let previous = '#101922', lastTop = 0;
    selectors.forEach((selector, index) => {
      const section = document.querySelector(selector);
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const translate = getComputedStyle(section).translate;
      const parts = translate === 'none' ? [] : translate.split(/\s+/);
      const shift = parts.length > 1 ? parseFloat(parts[1]) || 0 : 0;
      const top = Math.max(lastTop, Math.round(rect.top - origin - shift));
      stops.push(`${previous} ${top}px`, `${colours[index]} ${top}px`);
      previous = colours[index]; lastTop = top;
    });
    canvas.style.backgroundImage = `linear-gradient(to bottom, ${stops.join(', ')})`;
  }
  const scheduleBackdrop = () => { if (!backdropFrame) backdropFrame = requestAnimationFrame(paintBackdrop); };
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleBackdrop);
    sections.forEach(section => observer.observe(section));
  }
  window.addEventListener('resize', scheduleBackdrop, {passive:true});
  window.addEventListener('load', scheduleBackdrop, {once:true});
  document.fonts?.ready.then(scheduleBackdrop);
  scheduleBackdrop();
  const preference = window.smMotion;
  const nativeReduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, lastTime = 0;
  const titlePositions = new WeakMap();
  const clamp = value => Math.max(0, Math.min(1, value));
  const disabled = () => preference ? preference.matches : nativeReduced.matches;
  function reset() {
    lastTime = 0;
    sections.forEach(section => { titlePositions.delete(section); section.style.removeProperty('--section-shift'); section.style.removeProperty('--section-depth'); section.style.removeProperty('--title-settle'); });
  }
  function draw(now) {
    frame = 0;
    if (disabled() || document.hidden) { reset(); return; }
    const alpha = 1 - Math.exp(-Math.min(lastTime ? now - lastTime : 16, 50) / 260);
    lastTime = now;
    let titlesMoving = false;
    function setTitle(section, target, offscreen) {
      let current = titlePositions.get(section);
      if (current === undefined || offscreen) current = target;
      else {
        const delta = target - current;
        if (Math.abs(delta) < .015) current = target;
        else { current += delta * alpha; titlesMoving = true; }
      }
      titlePositions.set(section, current);
      section.style.setProperty('--title-settle', `${current.toFixed(2)}px`);
    }
    const height = window.innerHeight || 1;
    // Complete the rise as the section reaches roughly the screen midpoint.
    const range = height * .52;
    const maximumLift = window.innerWidth <= 700 ? 205 : 330;
    const exitLift = window.innerWidth <= 700 ? 64 : 90;
    const geometry = sections.map(section => {
      const rect = section.getBoundingClientRect();
      const value = getComputedStyle(section).translate;
      const parts = value === 'none' ? [] : value.split(/\s+/);
      const currentY = parts.length > 1 ? parseFloat(parts[1]) || 0 : 0;
      return {section, rect, currentY};
    });
    for (const {section, rect, currentY} of geometry) {
      // Compact sections travel a little less so their content stays readable.
      const lift = maximumLift * Math.max(.72, Math.min(1, rect.height / height));
      // Individual translate participates in the bounding rect: subtract its
      // currently rendered value so interpolation never feeds back on itself.
      const top = rect.top - currentY, bottom = rect.bottom - currentY;
      if (top > height + 100) {
        section.style.setProperty('--section-shift', `${lift}px`);
        setTitle(section, window.innerWidth <= 700 ? 14 : 22, true);
        continue;
      }
      if (bottom < -100) {
        section.style.setProperty('--section-shift', `${exitLift}px`);
        setTitle(section, 0, true);
        continue;
      }
      const entry = clamp((height - top) / range);
      section.style.setProperty('--section-depth', `${Math.max(-18, Math.min(18, (top / height - .5) * 18)).toFixed(1)}px`);
      // The heading follows the section and settles a little later, without opacity changes.
      const titleLift = window.innerWidth <= 700 ? 14 : 22;
      setTitle(section, titleLift * Math.pow(1 - entry, 1.25), false);
      const exit = clamp(bottom / range);
      // A quicker start gives the section momentum; it settles gently at
      // mid-screen. Exit keeps the previous, more restrained return movement.
      const entering = lift * Math.pow(1 - entry, 1.8);
      const exitEase = exit * exit * (3 - 2 * exit);
      const leaving = exitLift * (1 - exitEase);
      section.style.setProperty('--section-shift', `${Math.max(entering, leaving).toFixed(2)}px`);
    }
    if (titlesMoving) frame = requestAnimationFrame(draw);
    else lastTime = 0;
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
  sections.forEach(section => section.classList.add('sm-section-motion'));
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('sm-smooth-scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  document.addEventListener('visibilitychange', schedule);
  preference?.addEventListener('change', schedule);
  nativeReduced.addEventListener?.('change', schedule);
  schedule();
})();
