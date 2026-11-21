(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionReduced = () => window.smMotion ? window.smMotion.matches : reduced.matches;
  document.querySelectorAll('.editorial-hero-actions a[href^="#"], .editorial-hero-scroll').forEach(link => {
    link.addEventListener('click', event => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      history.pushState(null, '', link.getAttribute('href'));
      if (window.smScrollToSection) window.smScrollToSection(target);
      else target.scrollIntoView({ behavior: motionReduced() ? 'instant' : 'smooth' });
    });
  });
  // Follow the smoothed page position, rather than wheel events, so the
  // transition also works with touch, keyboard and the site's scroll engine.
  const stage = document.querySelector('.editorial-hero-stage');
  const visual = document.querySelector('.editorial-field-visual');
  const media = document.querySelector('.editorial-hero-media');
  const band = document.querySelector('.hero-wordband');
  if (!stage || !visual || !media || !band) return;
  let active = true, frame = 0, filteredProgress = null, lastFrame = 0;
  const tick = now => {
    frame = 0;
    if (!active || document.hidden || motionReduced()) {
      filteredProgress = null; lastFrame = 0;
      if (motionReduced()) {
        visual.style.removeProperty('--field-zoom');
        visual.style.removeProperty('--field-tilt');
        visual.style.removeProperty('--field-pan');
        media.style.removeProperty('--field-offset');
        media.style.removeProperty('--field-fade');
        band.style.removeProperty('--band-lift');
        band.style.removeProperty('--band-reveal');
      }
      return;
    }
    const rect = stage.getBoundingClientRect();
    const distance = Math.max(1, rect.height - media.offsetHeight);
    media.style.setProperty('--field-offset', `${Math.max(0, Math.min(distance, -rect.top)).toFixed(1)}px`);
    const target = Math.max(0, Math.min(1, -rect.top / distance));
    // Time-based damping smooths quick wheel/touch input in both directions.
    const elapsed = lastFrame ? Math.min(50, now - lastFrame) : 16;
    lastFrame = now;
    if (filteredProgress === null) filteredProgress = target;
    filteredProgress += (target - filteredProgress) * (1 - Math.exp(-elapsed / 140));
    if (Math.abs(target - filteredProgress) < .0001) filteredProgress = target;
    const progress = filteredProgress;
    const eased = progress * progress * (3 - 2 * progress);
    const tiltProgress = Math.max(0, Math.min(1, (progress - .04) / .86));
    const easedTilt = tiltProgress * tiltProgress * (3 - 2 * tiltProgress);
    // Ease the camera into the pitch while keeping its centre in view.
    const zoomRange = window.innerWidth <= 700 ? 1.4 : 1.65;
    visual.style.setProperty('--field-zoom', (1 + eased * zoomRange).toFixed(4));
    visual.style.setProperty('--field-tilt', `${(easedTilt * (window.innerWidth <= 700 ? 7 : 12)).toFixed(2)}deg`);
    visual.style.setProperty('--field-pan', `${(-eased * (window.innerWidth <= 700 ? 10 : 18)).toFixed(1)}px`);
    media.style.setProperty('--field-fade', '0');
    const reveal = Math.max(0, Math.min(1, (progress - 0.52) / 0.4));
    const easedReveal = reveal * reveal * (3 - 2 * reveal);
    band.style.setProperty('--band-lift', `${((1 - easedReveal) * 34).toFixed(1)}px`);
    band.style.setProperty('--band-reveal', '1');
    frame = requestAnimationFrame(tick);
  };
  const start = () => { if (!frame) frame = requestAnimationFrame(tick); };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { active = entries[0].isIntersecting; if (active) start(); }).observe(stage);
  }
  reduced.addEventListener?.('change', start);
  document.addEventListener('visibilitychange', start);
  new MutationObserver(start).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion-reduced'] });
  start();
})();
