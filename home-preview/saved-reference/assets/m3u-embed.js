(()=>{
 const iframe=document.querySelector('#m3u-player iframe');if(!iframe)return;
 let resizeTimer=0;
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==iframe.contentWindow||event.data?.type!=='sm-m3u-height')return;
  const height=Number(event.data.height);if(!Number.isFinite(height)||height<1||height>50000)return;
  const next=Math.ceil(height);if(Math.abs(iframe.getBoundingClientRect().height-next)<2)return;
  iframe.style.height=next+'px';
  // Refresh the existing desktop smooth-scroll measurements after the frame settles.
  clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>window.dispatchEvent(new Event('resize')),180);
 });
})();
