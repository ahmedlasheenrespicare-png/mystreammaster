/* Only animate the contact artwork while it is visible. */
(() => {
  const scene = document.querySelector('.mountain-cta');
  const stage = scene?.querySelector('.sm-footer__cta');
  if (!scene || !stage || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(entries => {
    scene.classList.toggle('is-offscreen', !entries[0].isIntersecting);
  }).observe(stage);
})();
