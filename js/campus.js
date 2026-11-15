/* UCIC — Interactive 3D Campus (Three.js) */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('campus3d');

if (canvas) {
  const scene = new THREE.Scene();
  const BG = 0x0E2537;
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 34, 76);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 180);
  camera.position.set(22, 25, 33);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 2.2;
  controls.maxDistance = 62;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 1.4, 0.5);
  controls.autoRotateSpeed = 0.85;

  /* ---------- Light ---------- */
  scene.add(new THREE.HemisphereLight(0xcfe3f0, 0x2C4038, 1.45));
  const sun = new THREE.DirectionalLight(0xffe4b8, 2.4);
  sun.position.set(-16, 26, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 100 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8fbdd8, 0.8);
  fill.position.set(16, 11, -18);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0x6b8299, 0.4));

  /* ---------- Materials ---------- */
  const M = (c, r = 0.72, m = 0.05) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const mats = {
    ground: M(0x3B4E4B, 0.95), grass: M(0x53705A, 0.95), walk: M(0x8C8577, 0.9),
    wall: M(0xCFC9B9), inside: M(0xE3DED1), base: M(0x9A9284),
    glass: new THREE.MeshStandardMaterial({ color: 0x2C5A70, roughness: 0.12, metalness: 0.45, transparent: true, opacity: 0.55 }),
    gold: M(0xD8B36A, 0.34, 0.4), roof: M(0x395363, 0.8),
    wood: M(0x7A5940), dark: M(0x1E262C, 0.6), screen: new THREE.MeshStandardMaterial({ color: 0x123247, emissive: 0x0d3d5c, emissiveIntensity: 0.7, roughness: 0.25 }),
    fabric: M(0x5A6C78), stone: M(0xB3AA96, 0.85), leaf: M(0x5E8365, 0.9), leaf2: M(0x76956D, 0.9)
  };

  const campus = new THREE.Group();
  scene.add(campus);

  /* ---------- Helpers ---------- */
  function box(parent, x, y, z, w, h, d, material, cast = true) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true;
    parent.add(o); return o;
  }
  function label(parent, text, x, y, z, w = 3.4) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const q = c.getContext('2d');
    q.fillStyle = 'rgba(8,24,43,0.92)'; q.fillRect(0, 0, 512, 128);
    q.strokeStyle = '#d8b36a'; q.lineWidth = 5; q.strokeRect(8, 8, 496, 112);
    q.fillStyle = '#f0d79e'; q.font = 'bold 31px Arial'; q.textAlign = 'center';
    q.fillText(text.toUpperCase(), 256, 78);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    sp.scale.set(w, w / 4, 1); sp.position.set(x, y, z); sp.renderOrder = 3;
    parent.add(sp); return sp;
  }

  /* ---------- Building generator ---------- */
  const roofs = [], pickables = [], rooms = {};

  function buildRoom(id, name, x, z, w, d, h, opts = {}) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.userData.room = id;
    campus.add(g);
    rooms[id] = g;

    // plinth + floor
    box(g, 0, 0.11, 0, w + 0.5, 0.22, d + 0.5, mats.base);
    box(g, 0, 0.24, 0, w, 0.06, d, mats.inside);

    // walls (back, left, right) — 0.22 thick
    const t = 0.22;
    box(g, 0, h / 2 + 0.24, -d / 2, w, h, t, mats.wall);
    box(g, -w / 2, h / 2 + 0.24, 0, t, h, d, mats.wall);
    box(g, w / 2, h / 2 + 0.24, 0, t, h, d, mats.wall);

    // solid parapet at the front + glass storefront with mullions
    box(g, 0, 0.7, d / 2, w, 0.95, 0.14, mats.wall);
    box(g, 0, (h + 0.95) / 2 + 0.24, d / 2, w, h - 0.95, 0.1, mats.glass, false);
    const posts = Math.max(3, Math.round(w / 1.6));
    for (let i = 0; i <= posts; i++) {
      const px = -w / 2 + (i * w) / posts;
      box(g, px, (h + 0.95) / 2 + 0.24, d / 2, 0.1, h - 0.95, 0.16, mats.dark);
    }
    // gold reveal band under the roofline
    box(g, 0, h + 0.2, d / 2 + 0.03, w, 0.08, 0.18, mats.gold, false);

    // roof slab + slim gold cornice trim
    const roof = box(g, 0, h + 0.4, 0, w + 0.55, 0.26, d + 0.55, mats.roof);
    roofs.push(roof);
    const trimY = h + 0.4, rw = (w + 0.55) / 2, rd = (d + 0.55) / 2;
    [[0, rd, w + 0.6, 0.09], [0, -rd, w + 0.6, 0.09], [-rw, 0, 0.09, d + 0.6], [rw, 0, 0.09, d + 0.6]]
      .forEach(([tx, tz, tw, td]) => roofs.push(box(g, tx, trimY + 0.16, tz, tw, 0.06, td, mats.gold, false)));
    if (opts.parapet) {
      const p1 = box(g, 0, h + 0.72, -d / 2 - 0.12, w + 0.55, 0.28, 0.14, mats.wall);
      roofs.push(p1);
    }

    // interaction proxy + label
    const hit = box(g, 0, h / 2, 0, w, h + 0.6, d, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.userData.room = id; hit.userData.title = name;
    pickables.push(hit);
    label(g, name, 0, h + 1.5, 0, Math.max(3.2, w * 0.82));

    // interior point lights for warmth
    const l = new THREE.PointLight(0xffe0b0, 0.9, Math.max(w, d) * 0.9, 2);
    l.position.set(0, h - 0.4, 0); g.add(l);

    return g;
  }

  function desk(g, x, z, w = 1.4, rot = 0) {
    const dsk = new THREE.Group(); dsk.position.set(x, 0, z); dsk.rotation.y = rot; g.add(dsk);
    box(dsk, 0, 1.02, 0, w, 0.11, 0.66, mats.wood);
    for (const dx of [-w / 2 + 0.12, w / 2 - 0.12]) for (const dz of [-0.22, 0.22]) box(dsk, dx, 0.52, dz, 0.07, 1.0, 0.07, mats.dark);
    return dsk;
  }
  function monitor(parent, x, y, z) {
    box(parent, x, y, z, 0.62, 0.4, 0.05, mats.dark);
    box(parent, x, y - 0.06, z - 0.03, 0.56, 0.34, 0.02, mats.screen, false);
    box(parent, x, y - 0.25, z, 0.07, 0.22, 0.07, mats.dark);
    box(parent, x, y - 0.37, z, 0.4, 0.04, 0.22, mats.dark);
  }
  function chair(g, x, z, rot = 0) {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = rot; g.add(c);
    box(c, 0, 0.58, 0, 0.46, 0.09, 0.46, mats.fabric);
    box(c, 0, 0.92, -0.2, 0.46, 0.52, 0.07, mats.fabric);
    box(c, 0, 0.34, 0, 0.09, 0.4, 0.09, mats.dark);
    box(c, 0, 0.14, 0, 0.5, 0.05, 0.5, mats.dark);
  }

  /* ---------- Site ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 62), mats.ground);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
  scene.add(ground);

  // grass campus plate
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(33, 27), mats.grass);
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, 0.004, 0.2); lawn.receiveShadow = true;
  campus.add(lawn);

  function paving(w, d, x, z, y = 0.012) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats.walk);
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true;
    campus.add(m); return m;
  }
  paving(29, 1.7, 0, 1.05);        // main east-west courtyard walk
  paving(6, 1.7, -14.6, 1.05);     // west approach
  paving(6, 1.7, 14.6, 1.05);      // east approach
  paving(1.9, 2.7, 0, -1.0);       // hub entrance
  paving(1.8, 2.5, -8.7, -0.95);   // music entrance
  paving(1.8, 2.5, 8.7, -0.95);    // media entrance
  paving(1.9, 2.5, 0, 3.2);        // learning entrance
  paving(1.8, 3.0, -8.9, 2.6);     // photo entrance
  paving(1.8, 3.0, 8.9, 2.7);      // enterprise entrance
  paving(1.4, 11.6, -4.5, 7.0);    // west alley to forecourt
  paving(1.4, 11.6, 4.5, 7.0);     // east alley to forecourt

  // central plaza disc with gold ring + fountain
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.07, 56), mats.stone);
  plaza.position.set(0, 0.05, 1.05); plaza.receiveShadow = true; campus.add(plaza);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.05, 8, 80), mats.gold);
  ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.1, 1.05); campus.add(ring);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 1.04, 0.36, 36), mats.stone);
  basin.position.set(0, 0.26, 1.05); basin.castShadow = true; basin.receiveShadow = true; campus.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 36),
    new THREE.MeshStandardMaterial({ color: 0x2E6C82, roughness: 0.05, metalness: 0.6 }));
  water.position.set(0, 0.46, 1.05); campus.add(water);

  /* ---------- Wings ---------- */
  // North row — music · hub · media
  let g = buildRoom('music', 'Music & sound wing', -8.7, -6.5, 8.2, 7, 4.0, { parapet: true });
  {
    // rug
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.0), mats.fabric);
    rug.rotation.x = -Math.PI / 2; rug.position.set(-1.1, 0.29, 0.2); g.add(rug);

    // desk + console
    const dsk = desk(g, -1.1, -1.2, 3.1);
    monitor(dsk, -0.95, 0.34, -0.24); monitor(dsk, 0.95, 0.34, -0.24);
    chair(g, -0.95, 0.1); chair(g, 0.95, 0.1);
    const con = new THREE.Group(); con.position.set(-1.1, 0, -0.42); con.rotation.x = -0.14; g.add(con);
    box(con, 0, 0.03, 0, 2.6, 0.12, 0.82, mats.dark);
    for (let i = 0; i < 14; i++) box(con, -1.1 + i * 0.17, 0.11, 0.08, 0.05, 0.05, 0.34, i % 4 === 0 ? mats.gold : mats.fabric);
    for (let i = 0; i < 8; i++) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10), mats.gold);
      knob.position.set(-0.98 + i * 0.28, 0.11, -0.24); con.add(knob);
    }
    // nearfield monitors on stands
    for (const sx of [-2.55, 0.35]) {
      box(g, sx, 0.62, -1.25, 0.06, 1.24, 0.06, mats.dark);
      box(g, sx, 0.06, -1.25, 0.34, 0.05, 0.34, mats.dark);
      const boxm = box(g, sx, 1.44, -1.25, 0.38, 0.6, 0.33, mats.dark);
      box(g, sx, 1.52, -1.09, 0.2, 0.2, 0.02, mats.inside, false);
      box(g, sx, 1.34, -1.09, 0.13, 0.13, 0.02, mats.gold, false);
    }
    // wall display monitor
    box(g, -1.1, 2.75, -3.82, 2.0, 1.15, 0.07, mats.screen, false);
    box(g, -1.1, 2.75, -3.74, 2.2, 1.35, 0.05, mats.dark);

    // MIDI keyboard on desk
    box(dsk, 0, 0.1, 0.16, 0.95, 0.07, 0.3, mats.dark);
    for (let i = 0; i < 14; i++) box(dsk, -0.42 + i * 0.064, 0.145, 0.2, 0.052, 0.02, 0.19, mats.inside, false);

    // acoustic panels on the west wall
    for (let i = 0; i < 3; i++) box(g, -3.94, 1.3 + i * 1.0, -1.3, 0.07, 0.8, 2.4, i % 2 ? mats.fabric : mats.wood, false);

    // guitar on the wall
    const guitar = new THREE.Group(); guitar.position.set(-3.9, 2.1, 1.6); guitar.rotation.z = 0.15; g.add(guitar);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 18), mats.wood);
    body.rotation.x = Math.PI / 2; body.rotation.z = Math.PI / 2; guitar.add(body);
    box(guitar, 0, 0.55, 0, 0.09, 0.85, 0.06, mats.dark);
    box(guitar, 0, 1.0, 0, 0.13, 0.2, 0.05, mats.dark);

    // sofa + plant
    box(g, 2.4, 0.72, 2.2, 2.1, 0.42, 0.9, mats.fabric);
    box(g, 2.4, 1.05, 1.83, 2.1, 0.45, 0.22, mats.fabric);
    for (const sx of [1.44, 3.36]) box(g, sx, 0.85, 2.2, 0.16, 0.7, 0.9, mats.fabric);
    box(g, -3.2, 0.55, 2.9, 0.72, 0.6, 0.72, mats.stone);
    const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), mats.leaf2);
    plant.position.set(-3.2, 1.35, 2.9); plant.castShadow = true; g.add(plant);

    // vocal booth — framed glazing, stool, headphones
    const booth = new THREE.Group(); booth.position.set(2.55, 0, -1.3); g.add(booth);
    const bH = 3.0, bW = 2.1, bD = 1.6;
    box(booth, 0, 0.3, 0, bW, 0.12, bD, mats.fabric);           // acoustic floor
    box(booth, 0, bH / 2 + 0.3, -bD / 2, bW, bH, 0.1, mats.inside);
    box(booth, 0, bH / 2 + 0.3, bD / 2, bW, bH, 0.08, mats.glass, false);
    box(booth, -bW / 2, bH / 2 + 0.3, 0, 0.08, bH, bD - 0.1, mats.glass, false);
    box(booth, bW / 2, bH / 2 + 0.3, 0, 0.08, bH, bD - 0.1, mats.glass, false);
    // black frame
    for (const fx of [-bW / 2, bW / 2]) for (const fz of [-bD / 2, bD / 2]) box(booth, fx, bH / 2 + 0.3, fz, 0.13, bH, 0.13, mats.dark);
    box(booth, 0, bH + 0.33, 0, bW + 0.2, 0.1, bD + 0.2, mats.dark);
    box(booth, 0, bH * 0.62, bD / 2, bW, 0.08, 0.1, mats.dark); // glazing transom
    // stool + mic + pop filter + headphones
    box(booth, 0.15, 0.62, 0.1, 0.4, 0.06, 0.4, mats.dark);
    box(booth, 0.15, 0.45, 0.1, 0.09, 0.36, 0.09, mats.dark);
    const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.55, 10), mats.dark);
    mic.position.set(-0.35, 1.1, 0.1); booth.add(mic);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.05, 16), mats.dark);
    base.position.set(-0.35, 0.33, 0.1); booth.add(base);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), mats.gold);
    head.position.set(-0.35, 1.95, 0.1); booth.add(head);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.011, 6, 18, Math.PI), mats.dark);
    arc.position.set(-0.35, 2.06, 0.1); arc.rotation.z = Math.PI; booth.add(arc);
    const pop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16), mats.dark);
    pop.position.set(-0.12, 1.8, 0.28); pop.rotation.set(Math.PI / 2, 0, 0.35); booth.add(pop);
    const phones = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 16, Math.PI), mats.dark);
    phones.position.set(0.15, 0.78, 0.1); phones.rotation.z = Math.PI; booth.add(phones);
    label(g, 'Vocal booth', 2.55, 3.75, -1.3, 2.0);
  }

  g = buildRoom('hub', 'Central innovation hub', 0, -6.5, 8, 8, 4.7);
  {
    box(g, 0, 0.98, -2.5, 3.4, 0.14, 0.95, mats.wood);
    box(g, 0, 0.6, -2.62, 2.6, 0.62, 0.12, mats.dark);
    box(g, 0, 1.14, -2.5, 3.4, 0.05, 0.2, mats.gold);
    label(g, 'Reception', 0, 1.95, -2.35, 2.0);
    // collaboration island
    box(g, 0, 1.0, 1.3, 3.6, 0.12, 1.5, mats.wood);
    for (const [dx, dz] of [[-1.5, -0.55], [1.5, -0.55], [-1.5, 0.55], [1.5, 0.55]]) box(g, dx, 0.5, 1.3 + dz, 0.09, 1.0, 0.09, mats.dark);
    chair(g, -0.85, 2.45, Math.PI); chair(g, 0.85, 2.45, Math.PI); chair(g, -0.85, 0.2, 0); chair(g, 0.85, 0.2, 0);
    // digital wall
    box(g, 0, 2.6, -3.9, 4.2, 2.0, 0.09, mats.screen, false);
    box(g, 0, 2.6, -3.82, 4.5, 2.3, 0.06, mats.dark);
    // planters
    for (const px of [-3.1, 3.1]) {
      box(g, px, 0.55, 3.1, 0.7, 0.6, 0.7, mats.stone);
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), mats.leaf);
      t.position.set(px, 1.25, 3.1); t.castShadow = true; g.add(t);
    }
  }

  g = buildRoom('media', 'Film & digital media wing', 8.7, -6.5, 8.2, 7, 4.2, { parapet: true });
  {
    // black-box stage: dark back wall + cyc
    box(g, 0, 1.9, -3.1, 6.6, 3.4, 0.16, mats.dark);
    box(g, 0, 0.5, -2.6, 6.6, 0.5, 0.7, mats.dark, false);
    // lighting grid
    for (let i = 0; i < 3; i++) box(g, 0, 3.9, -2.4 + i * 1.35, 7.2, 0.08, 0.08, mats.dark);
    for (let i = 0; i < 5; i++) {
      const x = -2.6 + i * 1.3;
      const spot = new THREE.SpotLight(0xffe2ab, 12, 9, 0.34, 0.55, 1.2);
      spot.position.set(x, 3.8, -1.1); spot.target.position.set(x, 0.1, 0.9);
      g.add(spot, spot.target);
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.3, 10), mats.gold);
      can.position.set(x, 3.8, -1.1); g.add(can);
    }
    // camera on tripod
    box(g, 2.2, 1.5, 2.0, 0.07, 1.5, 0.07, mats.dark);
    box(g, 2.2, 2.3, 2.0, 0.42, 0.3, 0.5, mats.dark);
    box(g, 2.2, 2.3, 2.28, 0.28, 0.22, 0.06, mats.screen, false);
    // editing bench
    desk(g, -2.1, 2.5, 2.2);
    monitor(g, -2.4, 1.42, 2.35); monitor(g, -1.6, 1.42, 2.35);
    chair(g, -2.1, 1.5, Math.PI);
    label(g, 'Stage', 0, 2.7, -3.0, 1.6);
  }

  // South row — photography · learning · enterprise
  g = buildRoom('photo', 'Photography & visual arts', -8.9, 7.6, 7.2, 6, 3.4);
  {
    box(g, 0, 1.85, -2.65, 5.2, 3.2, 0.14, mats.inside);
    // seamless paper backdrop sweep
    const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.0, 18, 1, true, Math.PI, Math.PI), mats.inside);
    bd.position.set(0, 1.6, -2.0); bd.rotation.x = Math.PI / 2; g.add(bd);
    box(g, 0, 0.7, -0.6, 2.4, 0.1, 1.6, mats.wood);
    for (const x of [-2.3, 2.3]) {
      box(g, x, 2.0, 0.3, 0.1, 2.8, 0.1, mats.dark);
      const soft = box(g, x, 2.7, 0.3, 0.8, 0.9, 0.14, mats.inside);
      soft.rotation.z = x < 0 ? -0.14 : 0.14; soft.rotation.y = x < 0 ? 0.3 : -0.3;
    }
    box(g, 0, 1.25, 2.0, 0.14, 1.6, 0.14, mats.dark);
    box(g, 0, 1.95, 2.0, 0.3, 0.22, 0.36, mats.dark);
    label(g, 'Photo studio', 0, 2.75, -2.4, 2.4);
  }

  g = buildRoom('learn', 'Learning pavilion', 0, 7.6, 7.6, 5.6, 3.2);
  {
    for (let i = 0; i < 3; i++) {
      const dsk = desk(g, -2.1 + i * 2.1, 0.4, 1.15, -0.35);
      monitor(dsk, 0, 0.35, -0.1);
      chair(dsk, 0, 0.62, 0);
    }
    box(g, 0, 2.35, -2.6, 4.6, 1.5, 0.08, mats.screen, false);
    box(g, 0, 2.35, -2.68, 4.9, 1.7, 0.05, mats.dark);
    for (let i = 0; i < 4; i++) box(g, -2.6 + i * 1.75, 3.1, -0.2, 1.4, 0.06, 0.06, mats.dark);
    label(g, 'Training', 0, 2.55, -2.35, 2.0);
  }

  g = buildRoom('enterprise', 'Enterprise studios', 8.9, 7.6, 7.2, 6, 3.3);
  {
    for (let i = 0; i < 3; i++) {
      const dsk = desk(g, -2.0 + i * 2.0, -0.5, 1.2);
      monitor(dsk, 0, 0.34, -0.12);
      chair(dsk, 0, 0.55, Math.PI);
    }
    box(g, 0, 2.0, -2.75, 4.4, 1.2, 0.06, mats.screen, false);
    for (const px of [-2.6, 2.6]) {
      box(g, px, 0.5, 2.1, 0.55, 0.5, 0.55, mats.stone);
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), mats.leaf2);
      t.position.set(px, 1.1, 2.1); t.castShadow = true; g.add(t);
    }
    label(g, 'Co-working', 0, 2.4, -2.6, 2.2);
  }

  /* ---------- Landscape ---------- */
  function path(points, r = 0.16) {
    const curve = new THREE.CatmullRomCurve3(points.map(pt => new THREE.Vector3(pt[0], 0.04, pt[1])));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 110, r, 8, false), mats.stone);
    m.receiveShadow = true; campus.add(m);
  }
  path([[-9.2, 1.05], [-6, 1.05], [0, 1.05], [6, 1.05], [9.2, 1.05]], 0.3);
  path([[5.5, 2.06], [5.5, 3.03]], 0.34);
  path([[-5.5, 2.06], [-5.5, 3.03]], 0.34);
  path([[-5.5, 9.0], [-3.3, 10.7], [-1.6, 11.3]], 0.42);
  path([[5.5, 9.0], [3.3, 10.7], [1.6, 11.3]], 0.42);

  // trees
  const treeSpots = [[-14.6, -9.0], [-11.0, -13.0], [-6.2, -13.0], [6.2, -13.0], [11.0, -13.0], [14.6, -9.0],
    [-15.3, -2.2], [15.3, -2.2], [-15.3, 9.6], [15.3, 9.6], [-8.8, 16.6], [8.8, 16.6], [-13.2, 12.6], [13.2, 12.6]];
  treeSpots.forEach(([x, z], i) => {
    const s = 0.9 + (i % 3) * 0.12;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * s, 0.17 * s, 1.3 * s, 8), mats.wood);
    trunk.position.set(x, 0.65 * s, z); trunk.castShadow = true; campus.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.78 * s, 1), i % 2 ? mats.leaf : mats.leaf2);
    crown.position.set(x, 1.7 * s, z); crown.castShadow = true; campus.add(crown);
  });

  // promenade lights
  for (let i = 0; i < 9; i++) {
    const x = -12.5 + i * 3.1;
    if (Math.abs(x) < 3.4) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.5, 8), mats.gold);
    pole.position.set(x, 0.75, 4.05); pole.castShadow = true; campus.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe9c0, emissive: 0xffd89a, emissiveIntensity: 2.2 }));
    bulb.position.set(x, 1.52, 4.05); campus.add(bulb);
  }

  // arrival canopy — slatted pergola, dark slats with gold edging
  const canopy = new THREE.Group(); canopy.position.set(0, 0, 14.9); campus.add(canopy);
  for (let i = 0; i < 13; i++) {
    const sz = -1.9 + i * 0.32;
    box(canopy, 0, 3.02, sz, 7.4, 0.1, 0.16, mats.roof);
  }
  for (const side of [-1, 1]) {
    box(canopy, 0, 3.09, side * 1.95, 7.6, 0.08, 0.14, mats.gold, false);
    box(canopy, side * 3.72, 3.09, 0, 0.14, 0.08, 4.1, mats.gold, false);
  }
  for (const cx of [-3.35, 3.35]) for (const cz of [-1.6, 1.6]) {
    box(canopy, cx, 1.48, cz, 0.15, 2.9, 0.15, mats.wall);
  }
  label(canopy, 'Main arrival', 0, 3.85, 0, 3.2);

  // perimeter hedge framing the site
  const hedge = (x, z, w, d) => box(campus, x, 0.42, z, w, 0.84, d, mats.leaf, false);
  hedge(0, -14.4, 31, 0.75);
  hedge(-16.0, 0.2, 0.75, 28);
  hedge(16.0, 0.2, 0.75, 28);
  hedge(-13.2, 15.6, 6.2, 0.75);
  hedge(13.2, 15.6, 6.2, 0.75);

  /* ---------- Focus states ---------- */
  const views = {
    hub: { pos: [12, 10, 12], target: [0, 1.4, -4] },
    music: { pos: [-6.2, 6.4, 3.4], target: [-8.7, 1.3, -5.2] },
    media: { pos: [6.2, 6.4, 3.4], target: [8.7, 1.4, -5.2] },
    photo: { pos: [-6.4, 5.6, 14.2], target: [-8.9, 1.1, 7.2] },
    learn: { pos: [0, 6.0, 15.5], target: [0, 1.2, 7.4] },
    enterprise: { pos: [6.4, 5.6, 14.2], target: [8.9, 1.2, 7.2] }
  };
  const names = {
    hub: 'Central innovation hub', music: 'Music & sound wing', media: 'Film & digital media wing',
    photo: 'Photography & visual arts', learn: 'Learning pavilion', enterprise: 'Enterprise studios'
  };
  const descriptions = {
    hub: 'Reception, shared collaboration tables, digital display wall and creative enterprise support. The hub links every programme area.',
    music: 'Concept music facility with a production control room, mixing console, nearfield monitors and an enclosed vocal booth. Final layouts depend on acoustic design.',
    media: 'Flexible black-box film and digital media stage with a lighting grid, camera position, cyc wall and production support bench.',
    photo: 'Photography studio concept with a paper backdrop sweep, soft lighting positions, product table and visual-arts workspace.',
    learn: 'Practical training pavilion with teaching stations, display screens, flexible workshop layout and mentorship space.',
    enterprise: 'Shared desks and digital workstations for incubated creative businesses, independent producers and technology innovators.'
  };

  let camGoal = null, targetGoal = null;
  const $ = id => document.getElementById(id);

  function focus(id) {
    const v = views[id] || views.hub;
    controls.minDistance = 2.2;
    camGoal = new THREE.Vector3(...v.pos);
    targetGoal = new THREE.Vector3(...v.target);
    $('room-title').textContent = names[id];
    $('room-desc').textContent = descriptions[id];
    document.querySelectorAll('.pill-tabs button').forEach(b => b.classList.toggle('active', b.dataset.room === id));
    $('campus-mode').textContent = names[id].replace(' wing', '').replace(' & ', ' · ') + ' focus';
  }
  window.ucicFocusRoom = focus;
  document.querySelectorAll('[data-room]').forEach(b => b.addEventListener('click', () => focus(b.dataset.room)));

  /* ---------- Picking ---------- */
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
    down = null;
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (hit) focus(hit.object.userData.room);
  });

  /* ---------- Controls ---------- */
  let roofsVisible = true;
  const roofBtn = $('roof-toggle');
  roofBtn.addEventListener('click', () => {
    if (typeof stopTour === 'function') stopTour();
    roofsVisible = !roofsVisible;
    roofs.forEach(o => { o.visible = roofsVisible; });
    roofBtn.textContent = roofsVisible ? 'Show interior layout' : 'Show roof / exterior';
    $('campus-mode').textContent = roofsVisible ? 'Exterior roof view' : 'Cutaway interior layout';
  });

  $('inside-toggle').addEventListener('click', () => {
    if (typeof stopTour === 'function') stopTour();
    roofs.forEach(o => { o.visible = false; });
    roofsVisible = false;
    roofBtn.textContent = 'Show roof / exterior';
    document.querySelectorAll('.pill-tabs button').forEach(b => b.classList.toggle('active', b.dataset.room === 'music'));
    $('room-title').textContent = names.music;
    $('room-desc').textContent = descriptions.music;
    controls.minDistance = 0.5;
    camGoal = new THREE.Vector3(-11.9, 2.55, -3.35);
    targetGoal = new THREE.Vector3(-7.4, 1.15, -8.0);
    $('campus-mode').textContent = 'Music studio interior · roof hidden';
  });

  const autoBtn = $('auto-toggle');

  /* ---------- Guided 3D tour ---------- */
  const tourOrder = ['hub', 'music', 'media', 'photo', 'learn', 'enterprise'];
  const tourCopy = {
    hub: 'We start at the central hub — reception, collaboration and enterprise support at the heart of the campus.',
    music: 'The music wing leads implementation: a control room, console, monitors and an enclosed vocal booth.',
    media: 'Next door, a black-box film and digital media stage with a lighting grid and camera position.',
    photo: 'South of the courtyard, the photography studio with a backdrop sweep and soft lighting positions.',
    learn: 'The learning pavilion hosts practical training, mentorship and flexible workshop layouts.',
    enterprise: 'Finally, enterprise studios: shared desks and workstations for incubated creative businesses.'
  };
  let tourTimer = null, tourIdx = 0;
  const tourBtn = $('tourBtn');
  function stopTour() {
    clearInterval(tourTimer); tourTimer = null;
    if (tourBtn) tourBtn.textContent = '▶ Start the guided 3D tour';
    autoBtn.textContent = 'Auto-orbit: ' + (controls.autoRotate ? 'On' : 'Off');
  }
  function tourStep() {
    const id = tourOrder[tourIdx % tourOrder.length];
    focus(id);
    $('campus-mode').textContent = 'Guided tour ' + (tourIdx % tourOrder.length + 1) + '/6 · ' + names[id];
    const d = $('room-desc');
    if (d) d.textContent = tourCopy[id];
    tourIdx++;
  }
  if (tourBtn) tourBtn.addEventListener('click', () => {
    if (tourTimer) { stopTour(); return; }
    roofs.forEach(o => { o.visible = false; });
    roofsVisible = false;
    roofBtn.textContent = 'Show roof / exterior';
    tourIdx = 0;
    tourStep();
    tourTimer = setInterval(tourStep, 5200);
    tourBtn.textContent = '⏸ Stop tour';
  });
  canvas.addEventListener('pointerdown', () => { if (tourTimer) stopTour(); });

  autoBtn.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    autoBtn.setAttribute('aria-pressed', String(controls.autoRotate));
    autoBtn.textContent = 'Auto-orbit: ' + (controls.autoRotate ? 'On' : 'Off');
  });

  $('reset-campus').addEventListener('click', () => {
    if (typeof stopTour === 'function') stopTour();
    roofs.forEach(o => { o.visible = true; });
    roofsVisible = true;
    roofBtn.textContent = 'Show interior layout';
    controls.minDistance = 2.2;
    camGoal = new THREE.Vector3(22, 25, 33);
    targetGoal = new THREE.Vector3(0, 1.4, 0.5);
    $('campus-mode').textContent = 'Exterior overview';
    $('room-title').textContent = 'Campus overview';
    $('room-desc').textContent = 'A connected concept campus with music, film, photography, learning, enterprise and shared innovation facilities arranged around a central courtyard.';
    document.querySelectorAll('.pill-tabs button').forEach(b => b.classList.remove('active'));
  });

  /* ---------- Resize / render ---------- */
  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(canvas);
  }
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) controls.autoRotate = false;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  resize();

  const loading = $('campus-loading');
  if (loading) loading.textContent = '3D campus ready · select a wing to explore';

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    if (camGoal) {
      camera.position.lerp(camGoal, 0.06);
      controls.target.lerp(targetGoal, 0.06);
      if (camera.position.distanceTo(camGoal) < 0.03) { camGoal = null; targetGoal = null; }
    }
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
