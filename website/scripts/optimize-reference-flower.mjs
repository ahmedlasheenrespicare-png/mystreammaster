// Apply a narrowly-scoped renderer optimization to the approved production
// snapshot without modifying the separately editable reference or its model.
// These anchors deliberately fail closed if the approved renderer changes.
export function optimizeReferenceFlower(source) {
  function replaceOnce(before, after) {
    const first = source.indexOf(before);
    if (first < 0 || source.indexOf(before, first + before.length) !== -1) {
      throw new Error('Approved flower renderer changed; review the performance patch');
    }
    source = source.slice(0, first) + after + source.slice(first + before.length);
  }

  // CSS controls the displayed size. Avoid allocating the authored, oversized
  // initial backing store before the first measured resize on any device.
  replaceOnce(
    'function(t){var e;let smMobile=window.innerWidth<=1023;const n=.0015',
    'function(t){var e;let smMobile=window.innerWidth<=1023;t.width=1,t.height=1;const n=.0015',
  );
  replaceOnce(
    'let s=smMobile?1.25:2;function a(){const smNextMobile=window.innerWidth<=1023;smNextMobile!==smMobile&&(smMobile=smNextMobile,s=smMobile?1.25:2);t.style.width="",t.style.height="",t.removeAttribute("width"),t.removeAttribute("height");const e=t.getBoundingClientRect(),n=Math.max(1,0|e.width),i=Math.max(1,0|e.height),a=Math.min(window.devicePixelRatio||1,s);r.setPixelRatio(a),r.setSize(n,i,!1),l.aspect=n/i,l.updateProjectionMatrix()}',
    // Keep the same CSS size, camera, model, materials and motion. Cap the
    // backing-store ratio on all screens and skip redundant WebGL resets.
    'let s=1,smWidth=0,smHeight=0,smRatio=0;t.style.width="",t.style.height="";function a(){const smNextMobile=window.innerWidth<=1023;smNextMobile!==smMobile&&(smMobile=smNextMobile);const e=t.getBoundingClientRect(),n=Math.max(1,0|e.width),i=Math.max(1,0|e.height),a=Math.min(window.devicePixelRatio||1,s),smSizeChanged=n!==smWidth||i!==smHeight,smRatioChanged=a!==smRatio;if(!smSizeChanged&&!smRatioChanged)return;smRatioChanged&&r.setPixelRatio(a),smSizeChanged&&(r.setSize(n,i,!1),l.aspect=n/i,l.updateProjectionMatrix()),smWidth=n,smHeight=i,smRatio=a}',
  );
  // The old desktop-only adaptive loop could raise the ratio back to two after
  // several smooth seconds, defeating the all-screen cap. Rotation timing and
  // the existing mobile frame limit remain unchanged.
  replaceOnce(
    'const e=S.getDelta(),n=1/Math.max(e,1e-6);smMobile||(T=.95*T+.05*n,T<45?(b++,E=0,b>30&&s>1&&(s=Math.max(1,s-.2),a(),b=0)):T>55&&s<2&&!i?(E++,b=0,E>120&&(s=Math.min(2,s+.2),a(),E=0)):(b=0,E=0));const smStep',
    'const e=S.getDelta();const smStep',
  );
  return source;
}
