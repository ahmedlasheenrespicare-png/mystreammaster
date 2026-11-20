import { useEffect, useRef } from "react";
import { motionMedia, motionReduced } from "../lib/motion-preference";

/** Refined, procedural Three.js sculpture behind the existing homepage devices. */
export default function HomepageWebGLStage() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // Narrow devices keep the lightweight CSS depth treatment and skip WebGL.
    if (window.matchMedia("(max-width: 760px)").matches) {
      host.dataset.webgl = "mobile";
      return;
    }

    let disposed = false;
    let renderer: import("three").WebGLRenderer | null = null;
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let sceneObserver: IntersectionObserver | null = null;
    let onVisibility: (() => void) | null = null;
    let onMotionChange: (() => void) | null = null;
    let motionPreference: ReturnType<typeof motionMedia> | null = null;
    let reduced = motionReduced();

    void (async () => {
      const THREE = await import("three");
      if (disposed || !host.isConnected) return;

      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
          stencil: false,
          depth: true,
        });
      } catch {
        host.dataset.webgl = "unavailable";
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
      camera.position.set(0, 7.4, 15.5);
      camera.lookAt(0, 0.35, 0);

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      renderer.domElement.className = "home-webgl-canvas";
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xfaf9f6, 0x24202d, 1.65));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
      keyLight.position.set(-5, 8, 6);
      scene.add(keyLight);
      const limeLight = new THREE.PointLight(0xd8ff3e, 11, 18, 2);
      limeLight.position.set(4.5, 2.5, -2);
      scene.add(limeLight);
      const violetLight = new THREE.PointLight(0x7c5cff, 8, 16, 2);
      violetLight.position.set(-4.5, 1.8, 3);
      scene.add(violetLight);

      const geometries: import("three").BufferGeometry[] = [];
      const materials: import("three").Material[] = [];
      const keep = <G extends import("three").BufferGeometry>(geometry: G) => {
        geometries.push(geometry);
        return geometry;
      };
      const keepMaterial = <M extends import("three").Material>(material: M) => {
        materials.push(material);
        return material;
      };
      const sculpture = new THREE.Group();
      scene.add(sculpture);

      // Fine, satin-metal rings: a quiet portal around the real HTML device mockups.
      const ringSpecs = [
        { radius: 4.7, tube: 0.036, color: 0xd8ff3e, emissive: 0x536519, opacity: 0.48, rotation: [Math.PI / 2, 0.08, -0.08] as const },
        { radius: 3.85, tube: 0.024, color: 0x7c5cff, emissive: 0x34266e, opacity: 0.43, rotation: [1.22, 0.2, 0.3] as const },
        { radius: 5.15, tube: 0.016, color: 0xfaf9f6, emissive: 0x4d465f, opacity: 0.34, rotation: [1.34, -0.12, -0.18] as const },
      ];
      const rings = ringSpecs.map((spec, index) => {
        const material = keepMaterial(new THREE.MeshStandardMaterial({
          color: spec.color,
          emissive: spec.emissive,
          emissiveIntensity: 0.5,
          roughness: 0.28,
          metalness: 0.76,
          transparent: true,
          opacity: spec.opacity,
        }));
        const mesh = new THREE.Mesh(keep(new THREE.TorusGeometry(spec.radius, spec.tube, 10, 160)), material);
        mesh.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
        mesh.position.y = -0.12 + index * 0.12;
        sculpture.add(mesh);
        return mesh;
      });

      // A thin floating glass plinth and one faceted crystal; no literal football props.
      const plinthMaterial = keepMaterial(new THREE.MeshPhysicalMaterial({
        color: 0x17161d,
        roughness: 0.24,
        metalness: 0.48,
        transparent: true,
        opacity: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.14,
      }));
      const plinth = new THREE.Mesh(keep(new THREE.CylinderGeometry(3.42, 3.52, 0.12, 96)), plinthMaterial);
      plinth.position.y = -0.42;
      sculpture.add(plinth);

      const crystal = new THREE.Group();
      crystal.position.set(-4.05, 0.85, 0.12);
      sculpture.add(crystal);
      const crystalMaterial = keepMaterial(new THREE.MeshPhysicalMaterial({
        color: 0xe5e1ff,
        emissive: 0x271f49,
        emissiveIntensity: 0.3,
        roughness: 0.12,
        metalness: 0.46,
        transparent: true,
        opacity: 0.62,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }));
      const crystalMesh = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(0.43, 1)), crystalMaterial);
      crystal.add(crystalMesh);
      const wireMaterial = keepMaterial(new THREE.LineBasicMaterial({ color: 0xd8ff3e, transparent: true, opacity: 0.7 }));
      const wire = new THREE.LineSegments(keep(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.49, 1))), wireMaterial);
      crystal.add(wire);

      const gemMaterial = keepMaterial(new THREE.MeshPhysicalMaterial({
        color: 0xd8ff3e, emissive: 0x798b22, emissiveIntensity: 0.44,
        metalness: 0.58, roughness: 0.2, clearcoat: 1,
      }));
      const gem = new THREE.Mesh(keep(new THREE.OctahedronGeometry(0.22, 0)), gemMaterial);
      gem.position.set(4.18, 0.46, -0.22);
      sculpture.add(gem);

      // A few pinpoint highlights complete the composed, gallery-like scene.
      const beadMaterial = keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xfaf9f6, emissive: 0xcac3e5, emissiveIntensity: 0.7,
        metalness: 0.72, roughness: 0.18,
      }));
      const beadGeometry = keep(new THREE.SphereGeometry(0.065, 16, 12));
      const beads = [
        [-4.55, 1.1, -0.65], [4.62, 1.48, 0.5], [0.35, 2.15, -3.1],
      ].map(([x, y, z]) => {
        const bead = new THREE.Mesh(beadGeometry, beadMaterial);
        bead.position.set(x, y, z);
        sculpture.add(bead);
        return bead;
      });

      const resize = () => {
        if (!renderer || disposed) return;
        const { width, height } = host.getBoundingClientRect();
        if (width < 1 || height < 1) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      resize();

      let inView = false;
      let intersects = false;
      let previousTime = 0;
      const renderLoop = (time: number) => {
        if (disposed || !renderer || !inView || document.hidden) {
          frame = 0;
          return;
        }
        frame = window.requestAnimationFrame(renderLoop);
        if (time - previousTime < 32) return;
        previousTime = time;
        if (!reduced) {
          rings[0].rotation.z += 0.0008;
          rings[1].rotation.y -= 0.00065;
          crystal.rotation.y += 0.0016;
          crystal.rotation.x += 0.0007;
          gem.rotation.y -= 0.0014;
          gem.rotation.x += 0.0008;
          beads[1].position.y = 1.48 + Math.sin(time * 0.0008) * 0.045;
        }
        renderer.render(scene, camera);
      };
      const startLoop = () => {
        inView = true;
        if (!frame && !reduced && !document.hidden) frame = window.requestAnimationFrame(renderLoop);
        else renderer?.render(scene, camera);
      };
      const stopLoop = () => {
        inView = false;
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      };
      sceneObserver = new IntersectionObserver(([entry]) => {
        intersects = Boolean(entry?.isIntersecting);
        if (intersects) startLoop();
        else stopLoop();
      }, { rootMargin: "220px" });
      sceneObserver.observe(host);
      motionPreference = motionMedia();
      onMotionChange = () => {
        reduced = motionPreference?.matches ?? false;
        if (reduced) {
          stopLoop();
          renderer?.render(scene, camera);
        } else if (intersects && !document.hidden) {
          startLoop();
        }
      };
      motionPreference.addEventListener("change", onMotionChange);
      onVisibility = () => {
        if (document.hidden || !intersects) stopLoop();
        else startLoop();
      };
      document.addEventListener("visibilitychange", onVisibility);
      if (reduced) renderer.render(scene, camera);

      host.dataset.webgl = "ready";

      const cleanupScene = () => {
        stopLoop();
        sceneObserver?.disconnect();
        resizeObserver?.disconnect();
        if (onVisibility) document.removeEventListener("visibilitychange", onVisibility);
        if (onMotionChange) motionPreference?.removeEventListener("change", onMotionChange);
        for (const geometry of geometries) geometry.dispose();
        for (const material of materials) material.dispose();
        renderer?.dispose();
        renderer?.domElement.remove();
      };
      (host as HTMLDivElement & { __cleanupScene?: () => void }).__cleanupScene = cleanupScene;
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      sceneObserver?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      if (onVisibility) document.removeEventListener("visibilitychange", onVisibility);
      if (onMotionChange) motionPreference?.removeEventListener("change", onMotionChange);
      const cleanup = (host as HTMLDivElement & { __cleanupScene?: () => void }).__cleanupScene;
      cleanup?.();
      delete (host as HTMLDivElement & { __cleanupScene?: () => void }).__cleanupScene;
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, []);

  return <div className="home-webgl-stage" ref={hostRef} aria-hidden="true" data-webgl="loading" />;
}
