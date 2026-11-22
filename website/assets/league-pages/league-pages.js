// The copy of the world sends the same return message as the original.
// Only this page's own same-origin iframe may ask to leave the experience.
const world = document.querySelector('.world-copy iframe');
window.addEventListener('message', event => {
  if (world && event.origin === location.origin && event.source === world.contentWindow && event.data?.type === 'kota-return') {
    location.assign('/');
  }
});
