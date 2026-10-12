// === Stream Master Pro - 3D Effects Optimized - Minimal pricing (no tilt on price cards) ===
(function() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 768) return;
  
  function initTilt() {
    const cards = document.querySelectorAll('.card'); // Only .card, not price-card for minimal clean
    if (cards.length === 0) return;
    let ticking = false;
    cards.forEach(card => {
      let mouseX = 0, mouseY = 0;
      function updateTransform() {
        const rect = card.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (mouseY - centerY) / 25;
        const rotateY = (centerX - mouseX) / 25;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(3px)`;
        ticking = false;
      }
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        if (!ticking) {
          requestAnimationFrame(updateTransform);
          ticking = true;
        }
      }, { passive: true });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)';
      }, { passive: true });
    });
  }
  
  function initWhenIdle() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(initTilt, { timeout: 2000 });
    } else {
      window.addEventListener('load', () => {
        setTimeout(initTilt, 500);
      });
    }
  }
  initWhenIdle();
})();
