let THREE, OrbitControls;

const host = document.querySelector('#viewer');
const status = document.querySelector('#viewer-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let renderer, controls, animation;
const params = new URLSearchParams(location.search);
const isX = params.get('logo') === 'x';
const cardMode = params.get('card') === '1';
const embedded = params.get('embed') === '1' || cardMode;
if (cardMode) { document.body.dataset.card = 'true'; document.documentElement.dataset.card = 'true'; }
if (embedded) document.body.dataset.embedded = 'true';
document.body.dataset.server = isX ? 'x' : 'nova';
document.querySelector(isX ? '#choose-x' : '#choose-nova')?.setAttribute('aria-current','page');
if (isX && !cardMode) {
  document.title = 'مجسّم شعار سيرفر X | معاينة ستريم ماستر';
  document.querySelector('#title').innerHTML = 'سيرفر X،<br><span>ببُعد جديد.</span>';
  document.querySelector('#description').textContent = 'شعار سيرفر X بتجسيم ثلاثي الأبعاد. لفّه واستكشف تفاصيله من كل زاوية.';
  document.querySelector('#server-caption').textContent = 'X SERVER';
  host.setAttribute('aria-label','مجسّم تفاعلي لشعار سيرفر X');
}

// A vector recreation based on the original artwork forms the front and back. A smooth
// marching-squares contour gives it genuine depth without pixelated voxel edges.
function makeLogo(image, part = 'base') {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // Split just the two circular marks from the artwork so they can enter
  // independently without changing their original relative positions.
  const rectangles = [[54, 0, 40, 40], [177, 15, 40, 40]];
  const sx = canvas.width / 217, sy = canvas.height / 132;
  ctx.save();
  const xPaths = {
    'x-red1': 'M 6 26 H 34 L 62 69 Q 68 76 62 85 L 34 129 H 6 L 34 85 Q 40 76 34 68 Z',
    'x-red2': 'M 45 26 H 73 L 101 68 Q 108 76 101 85 L 73 129 H 45 L 73 85 Q 79 76 73 68 Z',
    'x-white1': 'M 112 26 H 140 L 115 64 L 101 44 Z',
    'x-white2': 'M 115 90 L 140 129 H 112 L 101 111 Z',
  };
  if (xPaths[part]) {
    ctx.scale(canvas.width / 146, canvas.height / 146);
    ctx.clip(new Path2D(xPaths[part]));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  if (part === 'left' || part === 'right') {
    const rect = rectangles[part === 'left' ? 0 : 1];
    ctx.beginPath(); ctx.rect(rect[0]*sx, rect[1]*sy, rect[2]*sx, rect[3]*sy); ctx.clip();
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.restore();
  if (part === 'base') for (const [x,y,w,h] of rectangles) ctx.clearRect(x*sx,y*sy,w*sx,h*sy);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const scale = (isX ? 3.8 : 4.7) / width, depth = .19;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const group = new THREE.Group();
  const plane = new THREE.PlaneGeometry(width * scale, height * scale);
  const artwork = new THREE.MeshBasicMaterial({ map:texture, transparent:true, alphaTest:.03, side:THREE.FrontSide, toneMapped:false });
  const front = new THREE.Mesh(plane, artwork); front.position.z = depth; group.add(front);
  // The highlight is clipped by the exact logo texture, never a rectangular overlay.
  const sheenMaterial = new THREE.ShaderMaterial({
    uniforms: { artwork: { value:texture }, sweep: { value:-1 }, strength: { value:0 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D artwork; uniform float sweep; uniform float strength; varying vec2 vUv;
      void main() { float mask = texture2D(artwork, vUv).a; float band = 1.0 - smoothstep(0.0, 0.12, abs(vUv.x + vUv.y * 0.22 - sweep));
      gl_FragColor = vec4(1.0, 0.94, 0.85, mask * band * strength); }`,
    transparent:true, depthWrite:false, side:THREE.FrontSide,
  });
  const sheen = new THREE.Mesh(plane, sheenMaterial); sheen.position.z = depth + .025; group.add(sheen);
  group.userData.sheen = sheenMaterial.uniforms;
  const back = new THREE.Mesh(plane, artwork); back.position.z = -depth; back.rotation.y = Math.PI; group.add(back);
  const positions = [], colors = [], bevelPositions = [], bevelColors = [];
  const alpha = (x,y) => x < 0 || y < 0 || x >= width || y >= height ? 0 : data[(y*width+x)*4+3];
  const color = new THREE.Color();
  // Interpolated edge crossings reduce jaggedness while retaining small details.
  const crossing = (a,b) => {
    const t = Math.max(0, Math.min(1, (128-a.v) / (b.v-a.v || 1)));
    return [a.x+(b.x-a.x)*t, a.y+(b.y-a.y)*t];
  };
  function side(a,b) {
    const mx = Math.max(0,Math.min(width-1,Math.round((a[0]+b[0])/2)));
    const my = Math.max(0,Math.min(height-1,Math.round((a[1]+b[1])/2)));
    // Transparent edge pixels can contain black RGB; sample a nearby opaque
    // pixel so the extrusion keeps the artwork's color instead of dark seams.
    let sx = mx, sy = my, best = alpha(mx,my);
    for (let dy=-4;dy<=4;dy+=2) for (let dx=-4;dx<=4;dx+=2) {
      const opacity = alpha(mx+dx,my+dy);
      if (opacity > best) { best = opacity; sx = mx+dx; sy = my+dy; }
    }
    const i=(sy*width+sx)*4;
    color.setRGB(data[i]/255,data[i+1]/255,data[i+2]/255,THREE.SRGBColorSpace).multiplyScalar(1.05);
    const point = ([x,y],z) => [(x-width/2)*scale,(height/2-y)*scale,z];
    for (const v of [point(a,depth),point(b,depth),point(b,-depth),point(a,depth),point(b,-depth),point(a,-depth)]) {
      positions.push(...v); colors.push(color.r,color.g,color.b);
    }
    // A narrow raised rim catches light along the actual traced silhouette.
    // Sample the alpha gradient to offset towards the inside of each shape,
    // including holes; this avoids a blocky square extrusion.
    function inner(p) {
      const x = Math.round(p[0]), y = Math.round(p[1]), r = 4;
      const gx = alpha(x+r,y)-alpha(x-r,y), gy = alpha(x,y+r)-alpha(x,y-r);
      const length = Math.hypot(gx,gy) || 1;
      return [p[0]+gx/length*3.5, p[1]+gy/length*3.5];
    }
    const ia = inner(a), ib = inner(b);
    const bevelColor = color.clone().lerp(new THREE.Color(0xffffff), .22);
    for (const v of [point(a,depth), point(b,depth), point(ib,depth+.014), point(a,depth), point(ib,depth+.014), point(ia,depth+.014)]) {
      bevelPositions.push(...v); bevelColors.push(bevelColor.r,bevelColor.g,bevelColor.b);
    }
  }
  for (let y=-1;y<height;y++) for (let x=-1;x<width;x++) {
    const corners=[{x,y,v:alpha(x,y)},{x:x+1,y,v:alpha(x+1,y)},{x:x+1,y:y+1,v:alpha(x+1,y+1)},{x,y:y+1,v:alpha(x,y+1)}];
    const edges=[];
    for(let e=0;e<4;e++) {
      const a=corners[e], b=corners[(e+1)%4];
      if ((a.v>=128)!==(b.v>=128)) edges.push(crossing(a,b));
    }
    if(edges.length===2) side(edges[0],edges[1]);
    else if(edges.length===4) { side(edges[0],edges[1]); side(edges[2],edges[3]); }
  }
  if (!positions.length) throw new Error('Logo image has no visible pixels');
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({vertexColors:true, metalness:.35, roughness:.3, side:THREE.DoubleSide});
  group.add(new THREE.Mesh(geometry,material));
  const bevelGeometry = new THREE.BufferGeometry();
  bevelGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bevelPositions,3));
  bevelGeometry.setAttribute('color',new THREE.Float32BufferAttribute(bevelColors,3));
  bevelGeometry.computeVertexNormals();
  const bevelMaterial = new THREE.MeshStandardMaterial({vertexColors:true, metalness:.45, roughness:.25, side:THREE.DoubleSide});
  group.add(new THREE.Mesh(bevelGeometry,bevelMaterial));
  group.userData.dispose = () => { plane.dispose(); artwork.dispose(); sheenMaterial.dispose(); texture.dispose(); geometry.dispose(); material.dispose(); bevelGeometry.dispose(); bevelMaterial.dispose(); };
  return group;
}

async function init() {
  [THREE, { OrbitControls }] = await Promise.all([import('three'), import('three/addons/controls/OrbitControls.js')]);
  const image = new Image(); image.src = new URL(isX ? './x-vector.svg' : './nova-vector.svg', import.meta.url).href;
  await image.decode();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 100); camera.position.set(0, .2, 10.8);
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 3));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute('aria-hidden','true'); host.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffece0, 0x502144, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3,4,7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff759c, 2); rim.position.set(4,-2,-4); scene.add(rim);
  const logo = new THREE.Group();
  const base = isX ? null : makeLogo(image, 'base');
  const leftDot = isX ? null : makeLogo(image, 'left');
  const rightDot = isX ? null : makeLogo(image, 'right');
  const pieces = isX ? ['x-red1','x-red2','x-white1','x-white2'].map(part => makeLogo(image, part)) : [base, leftDot, rightDot];
  logo.add(...pieces);
  logo.rotation.y = -.17; logo.rotation.x = .05; scene.add(logo);
  // A restrained display plinth adds depth without changing the logo itself.
  const pedestal = new THREE.Group();
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 256;
  const glowContext = glowCanvas.getContext('2d');
  if (!glowContext) throw new Error('Canvas unavailable');
  const gradient = glowContext.createRadialGradient(128,128,8,128,128,128);
  gradient.addColorStop(0, 'rgba(255,165,100,.45)');
  gradient.addColorStop(.45, 'rgba(247,72,123,.20)');
  gradient.addColorStop(1, 'rgba(247,72,123,0)');
  glowContext.fillStyle = gradient; glowContext.fillRect(0,0,256,256);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  const floorGlowMaterial = new THREE.MeshBasicMaterial({map:glowTexture, transparent:true, depthWrite:false, side:THREE.DoubleSide});
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(7,7), floorGlowMaterial);
  floorGlow.rotation.x = -Math.PI/2; floorGlow.position.y = -2.04; pedestal.add(floorGlow);
  const glowMaterial = new THREE.MeshBasicMaterial({color:0xff8b82, transparent:true, opacity:.10, depthWrite:false});
  const glow = new THREE.Mesh(new THREE.RingGeometry(2.18,2.5,96), glowMaterial);
  glow.rotation.x = -Math.PI/2; glow.position.y = -2.025; pedestal.add(glow);
  const plinthMaterial = new THREE.MeshStandardMaterial({color:0x422939, metalness:.65, roughness:.3});
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.15,2.3,.14,96), plinthMaterial);
  plinth.position.y = -1.95; pedestal.add(plinth);
  const rimMaterial = new THREE.MeshBasicMaterial({color:0xe58a94, transparent:true, opacity:.65});
  const rimLine = new THREE.Mesh(new THREE.TorusGeometry(2.15,.018,8,120), rimMaterial);
  rimLine.rotation.x = Math.PI/2; rimLine.position.y = -1.87; pedestal.add(rimLine);
  if (!cardMode) scene.add(pedestal);
  document.querySelectorAll('[data-rotate]').forEach(button => button.addEventListener('click', () => {
    setSpin(false);
    logo.rotation.y += Number(button.dataset.rotate) * Math.PI / 8;
  }));
  host.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault(); setSpin(false);
    logo.rotation.y += (event.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 12;
  });
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 6; controls.maxDistance = 17;
  const spinButton = document.querySelector('#spin');
  function setSpin(enabled) {
    controls.autoRotate = enabled && !cardMode;
    spinButton.setAttribute('aria-pressed', String(enabled));
    spinButton.textContent = enabled ? 'إيقاف الدوران' : 'تشغيل الدوران';
  }
  controls.autoRotateSpeed = 1.5;
  setSpin(!reducedMotion.matches);
  spinButton.addEventListener('click', () => setSpin(!controls.autoRotate));
  controls.addEventListener('start', () => setSpin(false));
  reducedMotion.addEventListener('change', e => { if (e.matches) setSpin(false); });
  for (const [id, factor] of [['zoom-in', .8], ['zoom-out', 1.25]]) {
    document.getElementById(id).addEventListener('click', () => {
      const offset = camera.position.clone().sub(controls.target);
      const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset.setLength(distance));
      controls.update();
    });
  }
  let fitted = false;
  function resize() {
    const { clientWidth:w, clientHeight:h } = host;
    camera.aspect = w / Math.max(1,h);
    // Fit the entire logo on narrow portrait viewports as well as wide screens.
    if (!fitted) {
      const distance = cardMode ? 7.2 : 10.8;
      camera.position.setLength(Math.max(distance, distance / Math.min(camera.aspect, 1)));
      fitted = true;
    }
    camera.updateProjectionMatrix(); renderer.setSize(w,h,false);
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  document.querySelector('#reset').addEventListener('click', () => { controls.reset(); setSpin(false); logo.rotation.set(.05, -.17, 0); fitted = false; resize(); });
  // A short entrance is skipped entirely for users who prefer reduced motion.
  let entranceStart = null;
  let entranceDone = reducedMotion.matches;
  let cardActive = true;
  function prepareEntrance() {
    entranceStart = null;
    entranceDone = reducedMotion.matches;
    if (entranceDone) {
      logo.scale.setScalar(1); logo.position.y = 0;
      pieces.forEach(piece => piece.position.set(0,0,0));
      host.dataset.entrance = 'complete';
      return;
    }
    logo.scale.setScalar(.94); logo.position.y = -.12;
    if (isX) {
      pieces[0].position.x = -1.8; pieces[1].position.x = -1.8;
      pieces[2].position.set(1.5, 1.1, 0); pieces[3].position.set(1.5, -1.1, 0);
    } else { leftDot.position.y = 2.8; rightDot.position.y = 2.8; }
    host.dataset.entrance = 'waiting';
  }
  prepareEntrance();
  if (cardMode) window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'server-card-active') return;
    const wasActive = cardActive;
    cardActive = !!event.data.active;
    if (cardActive && !wasActive) prepareEntrance();
  });
  let entranceAnnounced = false;
  function render(now) {
    animation = requestAnimationFrame(render);
    if (document.hidden || (cardMode && !cardActive)) return;
    if (!entranceDone) {
      if (reducedMotion.matches) entranceDone = true;
      else {
        entranceStart ??= now;
        const elapsed = now - entranceStart;
        const t = Math.min(1, elapsed / 850);
        const ease = 1 - Math.pow(1-t, 3);
        logo.scale.setScalar(.94 + .06 * ease);
        logo.position.y = -.12 * (1-ease);
        // Right-hand mark lands first, then the V2 mark follows.
        const drop = delay => {
          const p = THREE.MathUtils.clamp((elapsed-delay)/900, 0, 1);
          // Ease-out bounce: the marks settle with a small, gentle rebound.
          const bounce = p < 1/2.75 ? 7.5625*p*p
            : p < 2/2.75 ? 7.5625*(p-1.5/2.75)**2+.75
            : p < 2.5/2.75 ? 7.5625*(p-2.25/2.75)**2+.9375
            : 7.5625*(p-2.625/2.75)**2+.984375;
          return 2.8 * (1-bounce);
        };
        if (isX) {
          // Red chevrons glide in from the left, followed by the white facets
          // from the right. Each piece settles into its exact original position.
          const remaining = delay => {
            const p = THREE.MathUtils.clamp((elapsed-delay)/800, 0, 1);
            return Math.pow(1-p, 3);
          };
          pieces[0].position.x = -1.8 * remaining(80);
          pieces[1].position.x = -1.8 * remaining(280);
          pieces[2].position.set(1.5*remaining(480), 1.1*remaining(480), 0);
          pieces[3].position.set(1.5*remaining(680), -1.1*remaining(680), 0);
        } else { rightDot.position.y = drop(180); leftDot.position.y = drop(630); }
        host.dataset.entrance = elapsed < 1080 ? 'first' : elapsed < 1530 ? 'second' : 'complete';
        entranceDone = elapsed >= 1530;
      }
      if (entranceDone) {
        logo.scale.setScalar(1); logo.position.y = 0;
        if (isX) pieces.forEach(piece => piece.position.set(0,0,0));
        else { leftDot.position.y = 0; rightDot.position.y = 0; }
        host.dataset.entrance = 'complete';
      }
    }
    if (entranceDone && !entranceAnnounced) {
      entranceAnnounced = true;
      if (embedded && !isX) parent.postMessage('nova-entrance-complete', location.origin);
    }
    // One restrained sweep follows the landing; it never loops or runs with reduced motion.
    const sweepProgress = entranceStart === null ? -1 : (now - entranceStart - 1530) / 900;
    const sweeping = !reducedMotion.matches && sweepProgress >= 0 && sweepProgress <= 1;
    for (const piece of pieces) {
      piece.userData.sheen.sweep.value = -0.15 + sweepProgress * 1.5;
      piece.userData.sheen.strength.value = sweeping ? .3 * Math.sin(Math.PI * sweepProgress) : 0;
    }
    controls.update();
    // Keep the card model legible throughout its motion: a gentle oscillation
    // instead of a full turn that makes the narrow logo disappear edge-on.
    if (cardMode && !reducedMotion.matches) logo.rotation.y = -.17 + Math.sin(now * .00055) * .38;
    // Light subtly follows the viewer's position while preserving the logo colors.
    key.position.x = THREE.MathUtils.clamp(camera.position.x * .35 - 3, -5, 5);
    rim.position.x = THREE.MathUtils.clamp(-camera.position.x * .3 + 4, -5, 6);
    renderer.render(scene,camera);
  }
  animation = requestAnimationFrame(render); status.hidden = true; host.dataset.ready = 'true';
  if (cardMode) parent.postMessage({type:'server-card-ready', server:isX ? 'x' : 'nova'}, location.origin);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(animation); observer.disconnect(); controls.dispose(); pieces.forEach(piece => piece.userData.dispose()); plinth.geometry.dispose(); plinthMaterial.dispose(); rimLine.geometry.dispose(); rimMaterial.dispose(); glow.geometry.dispose(); glowMaterial.dispose(); floorGlow.geometry.dispose(); floorGlowMaterial.dispose(); glowTexture.dispose(); renderer.dispose(); }, { once:true });
}
function showFallback() {
  if (embedded && !isX) parent.postMessage('nova-entrance-complete', location.origin);
  if (renderer) renderer.dispose();
  document.querySelectorAll('.controls button').forEach(button => { button.disabled = true; });
  status.textContent = isX ? 'تعذّر عرض المجسّم على هذا الجهاز. يمكنك مشاهدة شعار سيرفر X الأصلي أدناه.' : 'تعذّر عرض المجسّم على هذا الجهاز. يمكنك مشاهدة شعار نوفا الأصلي أدناه.';
  const fallback = document.createElement('img'); fallback.src=isX ? '/images/brand/xtv-mark.png' : '/images/brand/nova-ticket.png'; fallback.alt=isX ? 'شعار سيرفر X' : 'شعار نوفا';
  fallback.style.cssText='position:absolute;inset:22% 15% auto;width:70%;height:45%;object-fit:contain';
  host.append(fallback); host.dataset.ready='fallback';
}
function startPreview() { init().catch(showFallback); }
// Keep the viewer cheap when this standalone preview is embedded below the fold.
if ('IntersectionObserver' in window) {
  const lazyObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      lazyObserver.disconnect();
      startPreview();
    }
  }, { rootMargin: '200px' });
  lazyObserver.observe(host);
} else startPreview();
