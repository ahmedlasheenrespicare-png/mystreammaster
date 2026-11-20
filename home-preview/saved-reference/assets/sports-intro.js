/* Move the reference-inspired caption through the title stack as it scrolls. */
(function () {
  const titles = document.querySelector('.sm-sports__titles');
  if (!titles) return;
  const reduce = window.smMotion;
  let frame = 0;
  function update() {
    frame = 0;
    if (reduce.matches) {
      titles.style.removeProperty('--sports-caption-shift');
      return;
    }
    const rect = titles.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    const progress = Math.max(0, Math.min(1, (innerHeight * .7 - rect.top) / (rect.height + innerHeight * .4)));
    titles.style.setProperty('--sports-caption-shift', `${((progress - .5) * Math.min(rect.height * .35, 180)).toFixed(1)}px`);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule);
  reduce.addEventListener?.('change', schedule);
  schedule();
})();
