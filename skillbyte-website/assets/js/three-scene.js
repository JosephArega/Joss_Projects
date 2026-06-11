/* =====================================================================
   SkillByte — Three.js scenes
   1. Site-wide particle-field background (#bg-canvas, all pages)
   2. Hero centerpiece: glowing icosahedron + orbit rings (#hero-3d, home)
   Both respect prefers-reduced-motion and pause when the tab is hidden.
   ===================================================================== */
import * as THREE from "three";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

const COLORS = {
  violet: new THREE.Color("#8f73ff"),
  violetDeep: new THREE.Color("#6d28d9"),
  cyan: new THREE.Color("#22d3ee"),
};

/* Soft round sprite so points render as glowing dots, not squares */
function circleSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,.8)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const sprite = circleSprite();

/* Shared mouse state (normalized -1..1), drives parallax on both scenes */
const mouse = { x: 0, y: 0 };
window.addEventListener(
  "pointermove",
  (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  },
  { passive: true }
);

function pointsCloud(count, spread, color, size, opacity) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread.x;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    map: sprite,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

/* ------------------------------------------------------------------ */
/* 1. Background starfield                                             */
/* ------------------------------------------------------------------ */
function initBackground(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070815, 0.012);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.z = 60;

  const violetField = pointsCloud(420, { x: 180, y: 110, z: 90 }, COLORS.violet, 1.7, 0.5);
  const cyanField = pointsCloud(220, { x: 200, y: 120, z: 110 }, COLORS.cyan, 1.3, 0.4);
  const dustField = pointsCloud(300, { x: 240, y: 140, z: 140 }, COLORS.violetDeep, 0.9, 0.3);
  scene.add(violetField, cyanField, dustField);

  /* big slow wireframe far behind everything for depth */
  const deepShape = new THREE.Mesh(
    new THREE.IcosahedronGeometry(34, 1),
    new THREE.MeshBasicMaterial({ color: COLORS.violetDeep, wireframe: true, transparent: true, opacity: 0.05 })
  );
  deepShape.position.set(38, -10, -60);
  scene.add(deepShape);

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", resize);

  let scrollDrift = 0;
  window.addEventListener("scroll", () => (scrollDrift = window.scrollY * 0.004), { passive: true });

  return function tick(t) {
    violetField.rotation.y = t * 0.018;
    cyanField.rotation.y = -t * 0.012;
    dustField.rotation.y = t * 0.008;
    deepShape.rotation.x = t * 0.04;
    deepShape.rotation.y = t * 0.05;
    camera.position.x += (mouse.x * 6 - camera.position.x) * 0.03;
    camera.position.y += (-mouse.y * 4 - scrollDrift - camera.position.y) * 0.03;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
  };
}

/* ------------------------------------------------------------------ */
/* 2. Hero centerpiece                                                 */
/* ------------------------------------------------------------------ */
function initHero(container) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(DPR);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.z = 8;

  scene.add(new THREE.AmbientLight(0x8888ff, 0.5));
  const keyLight = new THREE.PointLight(0x7c4dff, 60, 40);
  keyLight.position.set(5, 4, 6);
  const rimLight = new THREE.PointLight(0x22d3ee, 45, 40);
  rimLight.position.set(-6, -3, 4);
  scene.add(keyLight, rimLight);

  const group = new THREE.Group();
  scene.add(group);

  /* core: dark glassy icosahedron */
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.55, 0),
    new THREE.MeshStandardMaterial({
      color: 0x161936,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x2a1d6b,
      emissiveIntensity: 0.55,
      flatShading: true,
    })
  );
  group.add(core);

  /* outer wireframe shell */
  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.35, 1)),
    new THREE.LineBasicMaterial({ color: COLORS.violet, transparent: true, opacity: 0.4 })
  );
  group.add(shell);

  /* glowing vertices on the shell */
  const shellGeo = new THREE.IcosahedronGeometry(2.35, 1);
  const nodes = new THREE.Points(
    shellGeo,
    new THREE.PointsMaterial({
      color: COLORS.cyan,
      size: 0.14,
      map: sprite,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  group.add(nodes);

  /* orbit rings */
  function ring(radius, color, opacity, tiltX, tiltZ) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 8, 120),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
    );
    r.rotation.x = tiltX;
    r.rotation.z = tiltZ;
    return r;
  }
  const ringA = ring(3.1, COLORS.cyan, 0.35, Math.PI / 2.4, 0.3);
  const ringB = ring(3.5, COLORS.violet, 0.25, Math.PI / 1.8, -0.5);
  group.add(ringA, ringB);

  /* small satellites that ride the rings */
  const satA = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan })
  );
  const satB = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.18),
    new THREE.MeshBasicMaterial({ color: COLORS.violet })
  );
  group.add(satA, satB);

  /* local particle halo */
  const halo = pointsCloud(140, { x: 9, y: 7, z: 6 }, COLORS.violet, 0.09, 0.6);
  group.add(halo);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(container);
  else window.addEventListener("resize", resize);

  let scrollSpin = 0;
  window.addEventListener("scroll", () => (scrollSpin = window.scrollY * 0.0012), { passive: true });

  return function tick(t) {
    group.rotation.y = t * 0.25 + scrollSpin;
    group.rotation.x += (mouse.y * 0.35 - group.rotation.x) * 0.04;
    group.rotation.z += (mouse.x * 0.12 - group.rotation.z) * 0.04;
    group.position.y = Math.sin(t * 0.8) * 0.18;

    core.rotation.y = -t * 0.15;
    nodes.rotation.y = t * 0.1;
    ringA.rotation.y = t * 0.3;
    ringB.rotation.y = -t * 0.22;

    const aA = t * 0.9;
    satA.position.set(Math.cos(aA) * 3.1, Math.sin(aA) * 0.9, Math.sin(aA) * 3.1 * 0.4);
    const aB = -t * 0.6 + 2;
    satB.position.set(Math.cos(aB) * 3.5, Math.sin(aB) * -1.1, Math.sin(aB) * 3.5 * 0.35);

    halo.rotation.y = -t * 0.06;
    renderer.render(scene, camera);
  };
}

/* ------------------------------------------------------------------ */
/* Boot + shared render loop                                           */
/* ------------------------------------------------------------------ */
(function boot() {
  const tickers = [];
  try {
    const bgCanvas = document.getElementById("bg-canvas");
    if (bgCanvas) tickers.push(initBackground(bgCanvas));
    const heroEl = document.getElementById("hero-3d");
    if (heroEl) tickers.push(initHero(heroEl));
  } catch (err) {
    /* No WebGL — CSS gradients carry the design on their own */
    console.warn("WebGL unavailable, skipping 3D scenes:", err);
    return;
  }
  if (!tickers.length) return;

  const clock = new THREE.Clock();
  let rafId = null;

  function loop() {
    const t = clock.getElapsedTime();
    tickers.forEach((fn) => fn(t));
    rafId = requestAnimationFrame(loop);
  }

  if (REDUCED) {
    /* one static frame, no animation */
    tickers.forEach((fn) => fn(0.5));
    return;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId), (rafId = null);
    } else if (!rafId) {
      loop();
    }
  });

  loop();
})();
