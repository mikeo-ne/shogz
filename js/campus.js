/* UCIC — Interactive 3D campus: a real single-storey U-plan building
 *
 * Plan (metres, +Z = arrival/south, -Z = rear/north)
 *
 *            ┌──────────── north block: 78 × 11 ────────────┐
 *            │  music  │  atrium (D/H)  │  film stage (D/H) │
 *            └──┬──────┴───────┬────────┴────────┬──────────┘
 *   west wing   │              │  courtyard     │   east wing
 *   10 × 26     │              │  40 × 22       │   10 × 26
 *            ┌──┴──────┬───────┴────────┬────────┴──────────┐
 *            │ photo   │  reception/entry│   enterprise     │
 *            └──────────── south block: 58 × 11 ────────────┘
 *
 * Every room sits inside a continuous external wall; circulation is via a
 * covered colonnade on the courtyard side, so the plan reads like a real
 * building rather than separate pavilions.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('campus3d');

/* The scene is ~43 meshes, 16 lights and a 2048² shadow map. Building it at
 * import time made the whole page feel slow, because that work ran while the
 * visitor was still reading the hero. The module is now imported on approach
 * (see the loader at the bottom of index.html) and simply builds on import. */

if (canvas) {
  /* ------------------------------------------------------------------ *
   * Renderer / scene
   * ------------------------------------------------------------------ */
  const BG = 0x0D2233;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 70, 260);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 220);
  const HOME = { pos: new THREE.Vector3(46, 44, 62), target: new THREE.Vector3(0, 2, -3) };
  camera.position.copy(HOME.pos);

  /* Adaptive quality. A 3x phone screen at a 2048² shadow map is a lot of
   * pixels to shade for a marketing page, so cap the render scale and drop
   * the shadow map on small / high-density screens. The massing still reads
   * because the sun angle carries the modelling. */
  const dpr = devicePixelRatio || 1;
  const smallScreen = Math.min(innerWidth, innerHeight) < 820;
  const maxRatio = smallScreen ? 1.5 : 2;
  const shadowSize = smallScreen ? 1024 : 2048;

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: !smallScreen, powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(dpr, maxRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = smallScreen ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 3;
  controls.maxDistance = 130;
  controls.maxPolarAngle = Math.PI * 0.492;
  controls.target.copy(HOME.target);
  controls.autoRotateSpeed = 0.7;

  /* ------------------------------------------------------------------ *
   * Light — warm late-afternoon sun from the west
   * ------------------------------------------------------------------ */
  scene.add(new THREE.HemisphereLight(0xd3e6f3, 0x33402f, 1.25));
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.5);
  sun.position.set(-38, 44, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, { left: -52, right: 52, top: 52, bottom: -52, near: 1, far: 160 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9cc6de, 0.55);
  fill.position.set(34, 20, -34);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0x6d8296, 0.35));

  /* ------------------------------------------------------------------ *
   * Materials
   * ------------------------------------------------------------------ */
  const M = (c, r = 0.75, m = 0.04) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9fc4d6, roughness: 0.08, metalness: 0.3,
    transparent: true, opacity: 0.32, side: THREE.DoubleSide
  });
  const mats = {
    earth: M(0x3E4E46, 0.98), grass: M(0x5A7A5C, 0.96), paving: M(0xBDB4A2, 0.9), paving2: M(0xCFC7B6, 0.9),
    wall: M(0xDCD6C6, 0.86), wallIn: M(0xF0EBDD, 0.9), plinth: M(0xA79E8C, 0.9),
    column: M(0xE4DED0, 0.82), beam: M(0x35302A, 0.7),
    roof: M(0x596C74, 0.88), roofTrim: M(0x2F3A3F, 0.8),
    gold: M(0xC9A45F, 0.35, 0.45), goldSoft: M(0xE0C58C, 0.5, 0.3),
    timber: M(0x9C7748, 0.8), timberDark: M(0x6E5233, 0.85),
    dark: M(0x22282C, 0.65), black: M(0x14181B, 0.7),
    fabric: M(0x5C6E78, 0.95), fabric2: M(0x74838C, 0.95), cream: M(0xEDE6D6, 0.9),
    screen: new THREE.MeshStandardMaterial({ color: 0x12394F, emissive: 0x1E6A8C, emissiveIntensity: 0.85, roughness: 0.3 }),
    leaf: M(0x4F7350, 0.95), leaf2: M(0x6C8F5F, 0.95), trunk: M(0x6B5138, 0.9),
    water: new THREE.MeshStandardMaterial({ color: 0x2E7A90, roughness: 0.05, metalness: 0.7 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xFFEBC2, emissive: 0xFFD08A, emissiveIntensity: 2.4, roughness: 0.4 })
  };

  const root = new THREE.Group();
  scene.add(root);

  /* ------------------------------------------------------------------ *
   * Geometry helpers
   * ------------------------------------------------------------------ */
  const boxGeoCache = new Map();
  function boxGeo(w, h, d) {
    const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
    let g = boxGeoCache.get(k);
    if (!g) { g = new THREE.BoxGeometry(w, h, d); boxGeoCache.set(k, g); }
    return g;
  }
  /** Axis-aligned box whose *base* sits at y, positioned by centre x/z. */
  function box(parent, x, y, z, w, h, d, material, cast = true) {
    const m = new THREE.Mesh(boxGeo(w, h, d), material);
    m.position.set(x, y + h / 2, z);
    m.castShadow = cast; m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  /** Wall with a rectangular opening (door / window / full-height void). */
  function wallWithOpening(parent, cx, cz, len, h, thick, opts = {}) {
    const {
      along = 'x', base = 0, openStart = null, openWidth = 0.9,
      sill = 0, head = 2.1, material = mats.wall, glass = true, cast = true
    } = opts;
    const g = new THREE.Group();
    g.position.set(cx, base, cz);
    parent.add(g);

    const put = (offset, w, y, hh, mat = material) => {
      if (w <= 0.01 || hh <= 0.01) return null;
      const along_ = along === 'x';
      return box(g, along_ ? offset : 0, y, along_ ? 0 : offset,
        along_ ? w : thick, hh, along_ ? thick : w, mat, cast);
    };

    if (openStart === null) {
      put(0, len, 0, h, material);
      return g;
    }
    const left = -len / 2 + openStart;
    const right = left + openWidth;
    const leftW = left + len / 2;
    const rightW = len / 2 - right;
    if (leftW > 0) put(-len / 2 + leftW / 2, leftW, 0, h);
    if (rightW > 0) put(len / 2 - rightW / 2, rightW, 0, h);
    if (sill > 0) put((left + right) / 2, openWidth, 0, sill);
    if (head < h) put((left + right) / 2, openWidth, head, h - head);
    if (glass && sill < head) {
      const along_ = along === 'x';
      const pane = new THREE.Mesh(boxGeo(along_ ? openWidth - 0.06 : 0.05, head - sill, along_ ? 0.05 : openWidth - 0.06), glassMat);
      pane.position.set(along_ ? (left + right) / 2 : 0, sill + (head - sill) / 2, along_ ? 0 : (left + right) / 2);
      g.add(pane);
      // slim frame
      put((left + right) / 2, openWidth, head - 0.05, 0.05, mats.beam);
      put(left + 0.025, 0.05, sill, head - sill, mats.beam);
      put(right - 0.025, 0.05, sill, head - sill, mats.beam);
    }
    return g;
  }
  function label(parent, text, x, y, z, w = 4) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 116;
    const q = c.getContext('2d');
    q.fillStyle = 'rgba(9,26,42,0.9)'; q.fillRect(0, 0, 512, 116);
    q.strokeStyle = '#D8B36A'; q.lineWidth = 4; q.strokeRect(6, 6, 500, 104);
    q.fillStyle = '#F2DCA8'; q.font = 'bold 29px Arial'; q.textAlign = 'center';
    q.fillText(text.toUpperCase(), 256, 72);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    sp.scale.set(w, w * 0.2266, 1); sp.position.set(x, y, z); sp.renderOrder = 4;
    parent.add(sp); return sp;
  }

  /* Furniture ------------------------------------------------------- */
  function desk(parent, x, z, w = 1.5, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g);
    box(g, 0, 0.72, 0, w, 0.06, 0.7, mats.timber);
    for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) for (const dz of [-0.26, 0.26]) {
      box(g, dx, 0, dz, 0.05, 0.72, 0.05, mats.dark);
    }
    return g;
  }
  function monitor(parent, x, y, z, s = 1) {
    box(parent, x, y, z, 0.6 * s, 0.38 * s, 0.04, mats.dark);
    box(parent, x, y, z + 0.025, 0.54 * s, 0.32 * s, 0.01, mats.screen, false);
    box(parent, x, y - 0.24 * s, z - 0.02, 0.06 * s, 0.16 * s, 0.06 * s, mats.dark);
    box(parent, x, y - 0.33 * s, z, 0.34 * s, 0.03, 0.2 * s, mats.dark);
  }
  function chair(parent, x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g);
    box(g, 0, 0.44, 0, 0.46, 0.07, 0.44, mats.fabric2);
    box(g, 0, 0.51, -0.19, 0.44, 0.44, 0.06, mats.fabric2);
    box(g, 0, 0.19, 0, 0.07, 0.36, 0.07, mats.dark);
    box(g, 0, 0.06, 0, 0.42, 0.05, 0.42, mats.dark);
    return g;
  }
  function plant(parent, x, z, s = 1) {
    box(parent, x, 0, z, 0.62 * s, 0.52 * s, 0.62 * s, mats.plinth);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52 * s, 1), Math.random() > 0.5 ? mats.leaf : mats.leaf2);
    c.position.set(x, 0.52 * s + 0.6 * s, z); c.castShadow = true;
    parent.add(c);
  }
  const stripMat = () => new THREE.MeshStandardMaterial({ color: 0x22303A, emissive: 0xFFC98A, emissiveIntensity: 1.6, roughness: 0.5 });
  function strip(parent, x, y, z, w, d, h = 0.06) {
    const m = box(parent, x, y, z, w, h, d, stripMat(), false);
    return m;
  }
  /* Each pendant used to add a real PointLight. Five of them, layered on the
   * sun, fill, hemisphere and ambient, is a lot of per-fragment work for a
   * phone GPU — and they only existed to make the shade look lit. The bulb
   * material is emissive, which reads the same at a fraction of the cost. */
  function pendant(parent, x, z, y, r = 0.16) {
    box(parent, x, y + 0.55, z, 0.012, 1.1, 0.012, mats.dark, false);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.1, 14, 1, true), mats.gold);
    shade.position.set(x, y + 0.5, z); shade.rotation.x = Math.PI; parent.add(shade);
    const b = new THREE.Mesh(new THREE.SphereGeometry(r * 0.45, 10, 8), mats.bulb);
    b.position.set(x, y + 0.36, z); parent.add(b);
    /* A soft glow disc where the light would fall on the floor. */
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(r * 3.4, 16),
      new THREE.MeshBasicMaterial({ color: 0xFFD9A0, transparent: true, opacity: 0.10, depthWrite: false })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.02, z);
    parent.add(pool);
  }

  /* ------------------------------------------------------------------ *
   * Site
   * ------------------------------------------------------------------ */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 200), mats.earth);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
  scene.add(ground);

  function slab(w, d, x, z, y = 0.01, mat = mats.paving) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true;
    root.add(m); return m;
  }
  // building platform + courtyard + forecourt + approach
  slab(96, 62, 0, -2, 0.012, mats.paving2);          // site apron
  slab(84, 50, 0, -3, 0.02, mats.paving);            // building footprint terrace
  slab(40, 21, 0, 1.5, 0.03, mats.grass);            // courtyard lawn
  slab(40, 5.4, 0, 15.2, 0.03, mats.paving2);        // forecourt
  slab(9, 30, 0, 32, 0.03, mats.paving2);            // entry approach
  slab(46, 3.6, 0, -13.6, 0.03, mats.paving2);       // service lane at rear

  // courtyard crossing paths
  slab(3.4, 20, -0.2, 1.5, 0.04, mats.paving2);
  slab(22, 3, 0, 1.4, 0.04, mats.paving2);

  // reflecting pool + planter ring at the courtyard centre
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.34, 48), mats.plinth);
  pool.position.set(0, 0.17, 1.4); pool.receiveShadow = true; root.add(pool);
  const poolWater = new THREE.Mesh(new THREE.CircleGeometry(2.85, 48), mats.water);
  poolWater.rotation.x = -Math.PI / 2; poolWater.position.set(0, 0.355, 1.4); root.add(poolWater);
  const poolRing = new THREE.Mesh(new THREE.TorusGeometry(3.16, 0.07, 8, 64), mats.gold);
  poolRing.rotation.x = Math.PI / 2; poolRing.position.set(0, 0.36, 1.4); root.add(poolRing);

  // trees along the courtyard and around the site
  const treeSpots = [
    [-13.5, 9.5, 1.05], [-13.5, 0.5, 0.95], [-13.5, -6.5, 1.0], [13.5, 9.5, 1.05],
    [13.5, 0.5, 0.95], [13.5, -6.5, 1.0], [-8.5, 11.4, 0.85], [8.5, 11.4, 0.85],
    [-32, 22, 1.2], [32, 22, 1.15], [-38, -6, 1.25], [38, -6, 1.2],
    [-30, 30, 1.1], [30, 30, 1.1], [-44, 12, 1.3], [44, 12, 1.25],
    [-22, -22, 1.15], [22, -22, 1.1], [-40, -22, 1.2], [40, -22, 1.2]
  ];
  treeSpots.forEach(([x, z, s], i) => {
    box(root, x, 0, z, 0.26 * s, 2.4 * s, 0.26 * s, mats.trunk);
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35 * s, 1), i % 2 ? mats.leaf : mats.leaf2);
    c1.position.set(x, 3.0 * s, z); c1.castShadow = true; root.add(c1);
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95 * s, 1), i % 3 ? mats.leaf2 : mats.leaf);
    c2.position.set(x + 0.4 * s, 3.9 * s, z - 0.3 * s); c2.castShadow = true; root.add(c2);
  });

  /* --- Site context: surrounding roads, city blocks and hills ------- */
  const ctx = new THREE.Group(); root.add(ctx);
  // main road along the south edge + access road
  const roadMat = M(0x33393E, 0.95);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(220, 12), roadMat);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.005, 44); ctx.add(road);
  const access = new THREE.Mesh(new THREE.PlaneGeometry(14, 26), roadMat);
  access.rotation.x = -Math.PI / 2; access.position.set(0, 0.005, 31); ctx.add(access);
  // lane markings
  for (let i = 0; i < 26; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.24), M(0xD9D3C2, 0.9));
    dash.rotation.x = -Math.PI / 2; dash.position.set(-100 + i * 8, 0.02, 44); ctx.add(dash);
  }
  // pavement strip
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(220, 3.2), mats.paving2);
  pave.rotation.x = -Math.PI / 2; pave.position.set(0, 0.008, 37.5); ctx.add(pave);

  // neighbouring blocks (kept low and desaturated so the proposal stays the subject)
  const nbrMats = [M(0xBFB7A5, 0.95), M(0xB3AA98, 0.95), M(0xC8C1B0, 0.95), M(0xA9A08E, 0.95)];
  const nbrRoof = M(0x6C6760, 0.9);
  function block(x, z, w, d, h, i) {
    const g = new THREE.Group(); g.position.set(x, 0, z); ctx.add(g);
    box(g, 0, 0, 0, w, h, d, nbrMats[i % nbrMats.length]);
    box(g, 0, h, 0, w + 0.3, 0.22, d + 0.3, nbrRoof);
    // simple window band
    for (let f = 1; f < Math.floor(h / 3.2); f++) {
      box(g, 0, f * 3.2, d / 2 + 0.01, w - 1.4, 1.3, 0.05, M(0x51616B, 0.4, 0.2), false);
      box(g, 0, f * 3.2, -d / 2 - 0.01, w - 1.4, 1.3, 0.05, M(0x51616B, 0.4, 0.2), false);
    }
  }
  const blocks = [
    [-64, 52, 26, 12, 7], [-30, 56, 22, 14, 10], [10, 58, 26, 13, 8.5],
    [44, 54, 20, 12, 12], [76, 46, 22, 16, 6.5],
    [-72, 10, 16, 26, 9], [-74, -22, 18, 20, 7], [70, 8, 15, 24, 11],
    [72, -24, 18, 20, 8], [-58, -52, 24, 16, 9], [-14, -56, 22, 16, 12],
    [30, -54, 24, 15, 8], [64, -50, 18, 16, 10]
  ];
  blocks.forEach((b, i) => block(...b, i));

  // distant hills on the horizon (Kampala’s seven hills, abstracted)
  const hillMat = M(0x6E8472, 0.98);
  [[-190, -150, 90, 26], [-40, -215, 120, 34], [130, -190, 100, 30], [250, -60, 90, 26], [-260, -20, 100, 28]]
    .forEach(([x, z, rx, h]) => {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(rx, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
      hill.scale.y = h / rx; hill.position.set(x, -2, z);
      ctx.add(hill);
    });

  // perimeter boundary wall with piers (reads as a real compound)
  const bound = MAT_WALL => {
    const g = new THREE.Group(); root.add(g);
    box(g, 0, 0, -30, 104, 1.5, 0.5, MAT_WALL);
    box(g, 0, 0, 34, 104, 1.5, 0.5, MAT_WALL);
    box(g, -51, 0, 2, 0.5, 1.5, 64, MAT_WALL);
    box(g, 51, 0, 2, 0.5, 1.5, 64, MAT_WALL);
    // gate piers and entry
    for (const x of [-5.4, 5.4]) box(g, x, 0, 34, 1.2, 2.6, 1.2, mats.plinth);
    box(g, 0, 2.4, 34, 12, 0.35, 0.9, mats.roofTrim);
    return g;
  };
  bound(mats.plinth);

  /* ------------------------------------------------------------------ *
   * Building shell — U-plan
   *     North block  : 78 wide (x -39..39), depth 11 (z -22..-11)
   *     West wing    : 10 wide (x -39..-29), depth 26 (z -11..15)
   *     East wing    : 10 wide (x  29..39),  depth 26 (z -11..15)
   *     South block  : 58 wide (x -29..29), depth 11 (z 15..26)
   * ------------------------------------------------------------------ */
  const shell = new THREE.Group(); root.add(shell);
  const H = 5.4;            // eaves height, single storey + clerestory
  const T = 0.34;           // external wall thickness
  const roofs = [];         // everything hidden in cutaway mode
  const pickables = [];     // raycast proxies
  const roomGroups = {};

  function roofSlab(parent, cx, cz, w, d, y, opts = {}) {
    const slabM = box(parent, cx, y, cz, w, 0.4, d, mats.roof);
    roofs.push(slabM);
    // dark fascia + gold reveal
    const f = box(parent, cx, y - 0.18, cz, w + 0.5, 0.22, d + 0.5, mats.roofTrim);
    roofs.push(f);
    const gr = box(parent, cx, y - 0.30, cz, w + 0.54, 0.08, d + 0.54, mats.gold, false);
    roofs.push(gr);
    if (opts.skylight) {
      for (let i = 0; i < opts.skylight; i++) {
        const sw = (w - 6) / opts.skylight;
        const sx = cx - w / 2 + 3 + sw * (i + 0.5);
        const sky = box(parent, sx, y + 0.42, cz, sw * 0.55, 0.1, d * 0.34, glassMat, false);
        roofs.push(sky);
      }
    }
    if (opts.parapet) {
      const p = box(parent, cx, y + 0.4, cz - d / 2 + 0.1, w + 0.4, 0.5, 0.16, mats.wall);
      roofs.push(p);
    }
    // rooftop plant / water tank for realism
    if (opts.plant) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.2, 16), mats.plinth);
      t.position.set(cx + w / 2 - 4, y + 1.5, cz + d / 2 - 3); t.castShadow = true;
      roofs.push(t); parent.add(t);
      for (let i = 0; i < 3; i++) roofs.push(box(parent, cx - w / 2 + 5 + i * 3.4, y + 0.4, cz + 1, 2.6, 0.9, 1.8, mats.plinth));
    }
    return slabM;
  }

  /* --------------------------- NORTH BLOCK --------------------------- */
  // Envelope: x -39..39, z -22..-11
  const NB = { x0: -39, x1: 39, z0: -22, z1: -11 };
  const nbG = new THREE.Group(); shell.add(nbG);
  box(nbG, 0, 0, (NB.z0 + NB.z1) / 2, NB.x1 - NB.x0 + 0.6, 0.45, 22, mats.plinth); // plinth
  // rear (north) wall — mostly solid, high clerestory band
  wallWithOpening(nbG, 0, NB.z0, 78, H, T, {
    along: 'x', openStart: 6, openWidth: 66, sill: 3.5, head: 5.0, glass: true
  });
  // west end wall & east end wall
  wallWithOpening(nbG, NB.x0, (NB.z0 + NB.z1) / 2, 11, H, T, { along: 'z', openStart: 3.4, openWidth: 4.2, sill: 0, head: 2.6 });
  wallWithOpening(nbG, NB.x1, (NB.z0 + NB.z1) / 2, 11, H, T, { along: 'z', openStart: 3.4, openWidth: 4.2, sill: 0, head: 2.6 });

  // interior partitions: music | atrium | film
  const music = { x0: -39, x1: -12, z0: -22, z1: -11 };
  const atrium = { x0: -12, x1: 12, z0: -22, z1: -11 };
  const film = { x0: 12, x1: 39, z0: -22, z1: -11 };
  // solid partitions with wide openings onto the colonnade
  wallWithOpening(nbG, -12, -16.5, 11, H, 0.28, { along: 'z', openStart: 2.5, openWidth: 2.2, head: 2.6 });
  wallWithOpening(nbG, 12, -16.5, 11, H, 0.28, { along: 'z', openStart: 2.5, openWidth: 2.2, head: 2.6 });

  // south (courtyard) façade: fully glazed with mullions, interrupted by the
  // three entrances. Built as segments so openings line up with the rooms.
  const facadeSegments = [
    { x0: -39, x1: -24 },  // music west
    { x0: -21.5, x1: -12 },// music east
    { x0: -11, x1: 11 },   // atrium glazing
    { x0: 12, x1: 21.5 },  // film west
    { x0: 24, x1: 39 }     // film east
  ];
  facadeSegments.forEach(s => {
    const w = s.x1 - s.x0;
    const cx = (s.x0 + s.x1) / 2;
    // sill + glazing + head band
    box(nbG, cx, 0, NB.z1, w, 0.55, 0.26, mats.wall);
    const pane = new THREE.Mesh(boxGeo(w - 0.1, 3.5, 0.06), glassMat);
    pane.position.set(cx, 0.55 + 1.75, NB.z1); nbG.add(pane);
    box(nbG, cx, 4.05, NB.z1, w, 1.35, 0.26, mats.wall);
    // mullions
    const n = Math.max(2, Math.round(w / 2.6));
    for (let i = 0; i <= n; i++) {
      box(nbG, s.x0 + (i * w) / n, 0, NB.z1, 0.1, 4.05, 0.3, mats.beam);
    }
    // transom
    box(nbG, cx, 2.4, NB.z1, w, 0.08, 0.3, mats.beam, false);
  });
  // entrance portals in the two gap locations (music & film doors)
  [-22.75, 22.75].forEach(x => {
    box(nbG, x, 0, NB.z1, 2.5, 4.05, 0.3, mats.wallIn); // recessed door surround
  });

  // The north block is roofed in three parts so the atrium and the film
  // stage can both be double-height volumes with their own rooflights.
  roofSlab(nbG, -25.5, (NB.z0 + NB.z1) / 2, 27.4, 12, H, { skylight: 3, parapet: true, plant: true });
  // atrium: no roof slab — the glazed lantern below closes the volume
  // film stage: taller volume with clerestory and its own roof
  const FROOF = 8.0;

  /* atrium: double-height volume, glazed lantern + clerestory */
  const AT_H = 9.2;
  const atG = new THREE.Group(); nbG.add(atG);
  // raised lantern walls above the roof (glass box)
  const atW = 24, atZ = (NB.z0 + NB.z1) / 2, atD = 11;
  const lantern = new THREE.Mesh(boxGeo(atW - 1, 3.6, atD - 1), glassMat);
  lantern.position.set(0, H + 0.42 + 1.8, atZ); atG.add(lantern);
  for (const [lx, lz] of [[-atW / 2 + 0.5, atZ - atD / 2 + 0.5], [atW / 2 - 0.5, atZ - atD / 2 + 0.5],
    [-atW / 2 + 0.5, atZ + atD / 2 - 0.5], [atW / 2 - 0.5, atZ + atD / 2 - 0.5]]) {
    box(atG, lx, H + 0.42, lz, 0.26, 3.6, 0.26, mats.beam);
  }
  // intermediate mullions so the lantern reads from outside
  for (let i = 1; i < 5; i++) {
    const mx = -atW / 2 + 0.5 + (i * (atW - 1)) / 5;
    box(atG, mx, H + 0.42, atD / 2 - 0.5 + atZ, 0.12, 3.6, 0.14, mats.beam);
    box(atG, mx, H + 0.42, -atD / 2 + 0.5 + atZ, 0.12, 3.6, 0.14, mats.beam);
  }
  box(atG, 0, H + 0.42, atZ, atW - 1, 0.14, atD - 1, glassMat, false);
  const lanternRoof = box(atG, 0, H + 0.42 + 3.6, atZ, atW + 0.4, 0.3, atD + 0.4, mats.roof);
  const lanternTrim = box(atG, 0, H + 0.42 + 3.42, atZ, atW + 0.6, 0.1, atD + 0.6, mats.gold, false);
  roofs.push(lanternRoof, lanternTrim);
  // lantern is see-through, so leave it visible in cutaway mode (it reads as a roof light)

  // atrium roof is a void: cut a hole by building the north roof in 2 parts
  // (handled by drawing the roof as two slabs either side of the atrium)
  // → remove the single slab and replace with split slabs
  // (done below by rebuilding: see roof replacement)

  /* --------------------------- WEST WING ----------------------------- */
  const WW = { x0: -39, x1: -29, z0: -11, z1: 15 };
  const wwG = new THREE.Group(); shell.add(wwG);
  box(wwG, -34, 0, 2, 10.6, 0.45, 26.6, mats.plinth);
  // west (outer) wall with strip windows
  for (const z of [-5.5, 1.5, 8.5]) {
    wallWithOpening(wwG, WW.x0, z - 1.5, 7, H, T, { along: 'z', openStart: 2.2, openWidth: 3.0, sill: 0.9, head: 4.3 });
  }
  wallWithOpening(wwG, WW.x0, -9.0, 4, H, T, { along: 'z' });
  wallWithOpening(wwG, WW.x0, 13.0, 4, H, T, { along: 'z' });
  // north end abuts north block; south end abuts south block → no end walls needed
  // internal corridor wall facing the courtyard
  wallWithOpening(wwG, WW.x1, 1.5, 26, H, 0.28, { along: 'z', openStart: 3.5, openWidth: 5.5, head: 2.8, glass: false });
  wallWithOpening(wwG, WW.x1, 9.0, 8, H, 0.28, { along: 'z', openStart: 2.5, openWidth: 3.0, head: 2.8, glass: false });
  // interior partitions
  wallWithOpening(wwG, -34, -4.5, 10, H, 0.24, { along: 'x', openStart: 3.4, openWidth: 1.6, head: 2.4 });
  wallWithOpening(wwG, -34, 6.5, 10, H, 0.24, { along: 'x', openStart: 3.4, openWidth: 1.6, head: 2.4 });
  roofSlab(wwG, -34, 2, 10.6, 27, H, { skylight: 2, parapet: true });

  /* --------------------------- EAST WING ----------------------------- */
  const EW = { x0: 29, x1: 39, z0: -11, z1: 15 };
  const ewG = new THREE.Group(); shell.add(ewG);
  box(ewG, 34, 0, 2, 10.6, 0.45, 26.6, mats.plinth);
  for (const z of [-5.5, 1.5, 8.5]) {
    wallWithOpening(ewG, EW.x1, z - 1.5, 7, H, T, { along: 'z', openStart: 2.2, openWidth: 3.0, sill: 0.9, head: 4.3 });
  }
  wallWithOpening(ewG, EW.x1, -9.0, 4, H, T, { along: 'z' });
  wallWithOpening(ewG, EW.x1, 13.0, 4, H, T, { along: 'z' });
  wallWithOpening(ewG, EW.x0, 1.5, 26, H, 0.28, { along: 'z', openStart: 11.5, openWidth: 5.5, head: 2.8, glass: false });
  wallWithOpening(ewG, EW.x0, 9.5, 7, H, 0.28, { along: 'z' });
  wallWithOpening(ewG, 34, -4.5, 10, H, 0.24, { along: 'x', openStart: 5.0, openWidth: 1.6, head: 2.4 });
  wallWithOpening(ewG, 34, 6.5, 10, H, 0.24, { along: 'x', openStart: 5.0, openWidth: 1.6, head: 2.4 });
  roofSlab(ewG, 34, 2, 10.6, 27, H, { skylight: 2, parapet: true });

  /* --------------------------- SOUTH BLOCK --------------------------- */
  const SB = { x0: -29, x1: 29, z0: 15, z1: 26 };
  const sbG = new THREE.Group(); shell.add(sbG);
  box(sbG, 0, 0, 20.5, 59, 0.45, 11.6, mats.plinth);
  // south (street) wall with high strip windows
  wallWithOpening(sbG, 0, SB.z1, 58, H, T, { along: 'x', openStart: 4, openWidth: 50, sill: 1.1, head: 3.4 });
  // main entrance — recessed porch with gold frame
  const porch = new THREE.Group(); sbG.add(porch);
  box(porch, 0, 0, SB.z1 + 1.6, 9.2, 0.2, 3.2, mats.plinth);
  for (const px of [-4.6, 4.6]) box(porch, px, 0, SB.z1 + 1.6, 0.5, H - 0.6, 3.2, mats.wall);
  box(porch, 0, H - 0.9, SB.z1 + 1.6, 9.8, 0.7, 3.4, mats.roofTrim);
  const porchSoffit = box(porch, 0, H - 1.05, SB.z1 + 1.6, 9.0, 0.08, 3.0, mats.goldSoft, false);
  roofs.push(porchSoffit);
  // entrance doors (glass)
  const doors = new THREE.Mesh(boxGeo(6.4, 3.0, 0.06), glassMat);
  doors.position.set(0, 1.5, SB.z1 + 0.02); sbG.add(doors);
  for (let i = 0; i <= 4; i++) box(sbG, -3.2 + i * 1.6, 0, SB.z1 + 0.04, 0.1, 3.0, 0.16, mats.beam);
  box(sbG, 0, 3.0, SB.z1 + 0.04, 6.4, 0.12, 0.18, mats.beam);
  label(sbG, 'Main entrance', 0, H + 0.4, SB.z1 + 2.6, 4.6);

  // west and east end walls of the south block
  wallWithOpening(sbG, SB.x0, 20.5, 11, H, T, { along: 'z', openStart: 4.2, openWidth: 2.4, head: 2.6 });
  wallWithOpening(sbG, SB.x1, 20.5, 11, H, T, { along: 'z', openStart: 4.2, openWidth: 2.4, head: 2.6 });
  // courtyard (north) façade of the south block — glazed with entrance
  const sbFacade = [
    { x0: -29, x1: -13 }, { x0: -12.5, x1: -6.5 }, { x0: 6.5, x1: 12.5 }, { x0: 13, x1: 29 }
  ];
  sbFacade.forEach(s => {
    const w = s.x1 - s.x0, cx = (s.x0 + s.x1) / 2;
    box(sbG, cx, 0, SB.z0, w, 0.55, 0.26, mats.wall);
    const pane = new THREE.Mesh(boxGeo(w - 0.1, 3.4, 0.06), glassMat);
    pane.position.set(cx, 0.55 + 1.7, SB.z0); sbG.add(pane);
    box(sbG, cx, 3.95, SB.z0, w, 1.45, 0.26, mats.wall);
    const n = Math.max(2, Math.round(w / 2.6));
    for (let i = 0; i <= n; i++) box(sbG, s.x0 + (i * w) / n, 0, SB.z0, 0.1, 3.95, 0.3, mats.beam);
  });
  // internal partitions
  wallWithOpening(sbG, -13, 20.5, 11, H, 0.28, { along: 'z', openStart: 3.4, openWidth: 2.0, head: 2.5 });
  wallWithOpening(sbG, 13, 20.5, 11, H, 0.28, { along: 'z', openStart: 3.4, openWidth: 2.0, head: 2.5 });
  roofSlab(sbG, 0, 20.5, 59.5, 12, H, { skylight: 5, parapet: true, plant: true });

  /* --------------------------- ROOF over atrium void ------------------ */
  // North-block roof already covers x -39..39; carve visually by overlaying
  // a glass lantern above (done) — acceptable for a massing model.

  /* --------------------------- COLONNADE ----------------------------- */
  // Covered walkway around the courtyard: columns + deep eaves + soffit lights
  const colon = new THREE.Group(); shell.add(colon);
  const colSpots = [];
  for (let x = -27.5; x <= 27.5; x += 5) { colSpots.push([x, 13.1]); colSpots.push([x, -9.2]); }
  for (let z = -8.5; z <= 12.5; z += 5.25) { colSpots.push([-27.9, z]); colSpots.push([27.9, z]); }
  colSpots.forEach(([x, z]) => {
    box(colon, x, 0, z, 0.52, H - 0.5, 0.52, mats.column);
    box(colon, x, H - 0.5, z, 0.74, 0.16, 0.74, mats.plinth);   // capital
    box(colon, x, 0, z, 0.72, 0.22, 0.72, mats.plinth);        // base
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), mats.bulb);
    lamp.position.set(x, H - 0.62, z);
    colon.add(lamp);
  });
  // eaves beams around the courtyard
  box(colon, 0, H - 0.34, 13.1, 57, 0.36, 0.5, mats.beam);
  box(colon, 0, H - 0.34, -9.2, 57, 0.36, 0.5, mats.beam);
  box(colon, -27.9, H - 0.34, 2, 0.5, 0.36, 23, mats.beam);
  box(colon, 27.9, H - 0.34, 2, 0.5, 0.36, 23, mats.beam);
  // continuous soffit lighting along the colonnade
  strip(colon, 0, H - 0.28, 12.2, 56, 0.12);
  strip(colon, 0, H - 0.28, -8.3, 56, 0.12);
  strip(colon, -28.9, H - 0.28, 2, 0.12, 22);
  strip(colon, 28.9, H - 0.28, 2, 0.12, 22);
  // lightweight walkway canopy (visible even in cutaway, so circulation reads)
  const walkRoof = [[0, 13.1, 57, 3.4], [0, -9.2, 57, 3.4], [-27.9, 2, 3.4, 23], [27.9, 2, 3.4, 23]];
  walkRoof.forEach(([x, z, w, d]) => {
    const c = box(colon, x, H - 0.1, z, w, 0.18, d, mats.roof);
    roofs.push(c);
    const tr = box(colon, x, H - 0.26, z, w + 0.2, 0.06, d + 0.2, mats.gold, false);
    roofs.push(tr);
  });

  /* ------------------------------------------------------------------ *
   * Room interiors
   * ------------------------------------------------------------------ */
  function room(id, title, group, x, z, w, d, proxyH = H) {
    const hit = box(group, x, 0, z, w, proxyH, d, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), false);
    hit.userData.room = id; hit.userData.title = title;
    pickables.push(hit);
    roomGroups[id] = group;
    return group;
  }

  /* ---- MUSIC (x -39..-12, z -22..-11) ------------------------------ */
  const mg = new THREE.Group(); nbG.add(mg);
  room('music', 'Music & sound wing', mg, -25.5, -16.5, 27, 11);
  // control room (west third) separated by glazing
  box(mg, -24.5, 0, -16.5, 0.16, H, 10.4, mats.wallIn);          // partition
  const ctrlGlass = new THREE.Mesh(boxGeo(0.05, 2.2, 6.2), glassMat);
  ctrlGlass.position.set(-24.5, 3.6, -16.5); mg.add(ctrlGlass);
  box(mg, -24.5, 0, -16.5, 0.18, 2.5, 6.4, mats.wallIn);
  box(mg, -24.5, 4.75, -16.5, 0.18, 0.65, 10.4, mats.wallIn);
  // console + monitors in the control room
  desk(mg, -30.5, -16.6, 3.0);
  monitor(mg, -31.4, 1.12, -16.9, 0.9); monitor(mg, -30.5, 1.12, -16.9, 0.9); monitor(mg, -29.6, 1.12, -16.9, 0.9);
  const con = new THREE.Group(); con.position.set(-30.5, 0.78, -15.9); con.rotation.x = -0.2; mg.add(con);
  box(con, 0, 0, 0, 2.7, 0.1, 0.78, mats.dark);
  for (let i = 0; i < 16; i++) box(con, -1.15 + i * 0.155, 0.07, 0.05, 0.045, 0.04, 0.3, i % 4 === 0 ? mats.gold : mats.fabric);
  for (let i = 0; i < 9; i++) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.035, 8), mats.gold);
    k.position.set(-1.0 + i * 0.25, 0.07, -0.24); con.add(k);
  }
  chair(mg, -30.5, -17.7, Math.PI);
  // nearfields
  for (const nx of [-32.0, -29.0]) {
    box(mg, nx, 0, -18.6, 0.05, 1.15, 0.05, mats.dark);
    const sp = box(mg, nx, 1.35, -18.6, 0.34, 0.52, 0.3, mats.dark);
    box(sp, 0, 0, 0, 0.2, 0.2, 0.02, mats.cream, false);
  }
  // rack of outboard gear
  box(mg, -34.6, 0, -16.5, 0.8, 2.0, 3.2, mats.dark);
  for (let i = 0; i < 6; i++) box(mg, -34.6, 0.25 + i * 0.3, -16.5, 0.82, 0.22, 2.9, i % 2 ? mats.fabric : mats.black, false);
  // acoustic treatment on the rear wall
  for (let i = 0; i < 4; i++) box(mg, -36.5 + i * 3.6, 1.2, -21.4, 2.6, 1.6, 0.12, mats.timberDark, false);
  // live room (east third): piano + drum kit + guitars
  const piano = new THREE.Group(); piano.position.set(-16.5, 0, -18.4); mg.add(piano);
  box(piano, 0, 0.7, 0, 3.2, 0.5, 1.5, mats.black);
  box(piano, 0, 1.2, 0, 3.2, 0.1, 1.1, mats.timberDark);
  box(piano, 0, 0.95, 0.72, 2.9, 0.09, 0.34, mats.cream);   // keys
  for (let i = 0; i < 24; i++) box(piano, -1.35 + i * 0.117, 1.04, 0.72, 0.05, 0.02, 0.3, mats.black, false);
  for (const px of [-1.45, 1.45]) box(piano, px, 0, 0, 0.16, 0.7, 1.2, mats.black);
  // drum kit
  const drums = new THREE.Group(); drums.position.set(-17.5, 0, -14.2); mg.add(drums);
  const kick = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.7, 20), mats.timberDark);
  kick.rotation.x = Math.PI / 2; kick.position.set(0, 0.62, 0); kick.castShadow = true; drums.add(kick);
  for (const [dx, dz, r] of [[-0.9, 0.4, 0.34], [0.9, 0.4, 0.34], [0, 0.85, 0.42]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 16), mats.timberDark);
    t.position.set(dx, 1.0, dz); t.rotation.x = Math.PI / 2.6; drums.add(t);
  }
  for (const sx of [-0.75, 0.75]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.03, 14), mats.gold);
    st.position.set(sx, 1.45, -0.1); st.rotation.z = sx < 0 ? -0.3 : 0.3; drums.add(st);
  }
  box(drums, 0, 0.48, 0.75, 0.5, 0.06, 0.5, mats.fabric);
  // vocal booth (glazed cabin) against the north wall
  const booth = new THREE.Group(); booth.position.set(-14, 0, -19.4); mg.add(booth);
  const bW = 3.2, bD = 2.8, bH = 3.1;
  box(booth, 0, 0, 0, bW, 0.14, bD, mats.fabric);
  box(booth, 0, 0.14, -bD / 2, bW, bH, 0.12, mats.wallIn);
  box(booth, -bW / 2, 0.14, 0, 0.1, bH, bD, mats.wallIn);
  box(booth, bW / 2, 0.14, 0, 0.1, bH, bD, mats.wallIn);
  const bg1 = new THREE.Mesh(boxGeo(bW - 0.2, bH, 0.06), glassMat); bg1.position.set(0, 0.14 + bH / 2, bD / 2); booth.add(bg1);
  for (const [fx, fz] of [[-bW / 2, bD / 2], [bW / 2, bD / 2], [-bW / 2, -bD / 2], [bW / 2, -bD / 2]]) {
    box(booth, fx, 0, fz, 0.15, bH + 0.14, 0.15, mats.dark);
  }
  box(booth, 0, bH + 0.14, 0, bW + 0.3, 0.2, bD + 0.3, mats.dark);
  box(booth, 0, 0.14 + bH * 0.62, bD / 2, bW, 0.07, 0.12, mats.dark);
  // mic on stand + headphones
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.6, 8), mats.dark);
  mic.position.set(-0.2, 1.0, 0.1); booth.add(mic);
  const mh = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 8), mats.gold); mh.position.set(-0.2, 1.88, 0.1); booth.add(mh);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.01, 6, 16, Math.PI), mats.dark);
  arc.position.set(-0.2, 1.98, 0.1); arc.rotation.z = Math.PI; booth.add(arc);
  const ph = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 6, 14, Math.PI), mats.dark);
  ph.position.set(0.75, 0.9, 0.2); ph.rotation.z = Math.PI; booth.add(ph);
  // guitars on the wall
  for (let i = 0; i < 3; i++) {
    const gx = -20.5 + i * 1.15;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), mats.timber);
    body.scale.set(0.78, 1.05, 0.34); body.position.set(gx, 1.95, -21.3); mg.add(body);
    box(mg, gx, 2.45, -21.32, 0.09, 0.72, 0.06, mats.black, false);   // neck
    box(mg, gx, 2.86, -21.32, 0.15, 0.2, 0.05, mats.black, false);    // headstock
  }
  // sofa + coffee table
  box(mg, -13.6, 0, -12.6, 2.2, 0.36, 0.85, mats.fabric);
  box(mg, -13.6, 0.36, -12.9, 2.2, 0.3, 0.2, mats.fabric);
  box(mg, -13.6, 0, -11.6, 1.1, 0.36, 0.6, mats.timber);
  plant(mg, -11.9, -20.6, 0.9);
  // programme accent wall (gold) behind the console
  box(mg, -25.5, 0, -21.72, 26.4, 0.16, 0.06, mats.gold, false);
  strip(mg, -30.5, 3.5, -18.8, 0.3, 2.4);
  label(mg, 'Music & sound', -25.5, H + 1.1, -16.5, 5.2);

  /* ---- ATRIUM (x -12..12, z -22..-11) ------------------------------ */
  const ag = new THREE.Group(); nbG.add(ag);
  room('hub', 'Central atrium & reception', ag, 0, -16.5, 24, 11, H);
  // reception desk facing the courtyard
  box(ag, 0, 0, -14.2, 5.0, 1.05, 1.0, mats.timber);
  box(ag, 0, 1.05, -14.2, 5.2, 0.07, 1.15, mats.cream);
  box(ag, 0, 0, -14.85, 5.2, 0.16, 0.1, mats.gold, false);
  for (let i = 0; i < 3; i++) monitor(ag, -0.9 + i * 0.9, 1.35, -14.4, 0.8);
  chair(ag, -1.6, -15.3, 0); chair(ag, 1.6, -15.3, 0);
  // feature wall + digital display
  box(ag, 0, 0, -21.2, 14, 4.4, 0.3, mats.timberDark);
  box(ag, 0, 2.2, -21.0, 7.2, 2.3, 0.09, mats.screen, false);
  // staircase to a mezzanine — reads as a real double-height hall
  const stair = new THREE.Group(); stair.position.set(7.4, 0, -16.2); ag.add(stair);
  for (let i = 0; i < 12; i++) box(stair, 0, i * 0.29, -2.6 + i * 0.42, 2.6, 0.24, 0.44, i % 2 ? mats.cream : mats.wallIn);
  // mezzanine balcony: slim slab, glass balustrade with a gold capping rail
  box(ag, -2.4, 3.5, -19.8, 15.2, 0.14, 3.0, mats.cream);
  box(ag, -2.4, 3.36, -18.35, 15.2, 0.16, 0.12, mats.beam);
  const balGlass = new THREE.Mesh(boxGeo(15.0, 1.0, 0.04), glassMat);
  balGlass.position.set(-2.4, 4.06, -18.35); ag.add(balGlass);
  for (let i = 0; i <= 12; i++) box(ag, -9.9 + i * 1.25, 3.56, -18.35, 0.05, 1.0, 0.05, mats.gold, false);
  box(ag, -2.4, 4.58, -18.35, 15.2, 0.07, 0.1, mats.gold, false);
  // simple balcony furniture
  for (let i = 0; i < 2; i++) { desk(ag, -6.5 + i * 3.2, -20.4, 2.0); chair(ag, -6.5 + i * 3.2, -19.6, Math.PI); }
  // planting under the skylight
  plant(ag, -9.0, -13.0, 1.3); plant(ag, 9.0, -13.0, 1.3);
  // pendant lights clustered in the void
  for (const [px, pz] of [[-3, -18.4], [0, -18.4], [3, -18.4], [-1.5, -16.0], [1.5, -16.0]]) pendant(ag, px, pz, 6.2, 0.18);
  // display plinths for creative work
  for (let i = 0; i < 3; i++) {
    box(ag, -4.4 + i * 4.4, 0, -12.6, 1.2, 0.9, 1.2, mats.plinth);
    box(ag, -4.4 + i * 4.4, 0.9, -12.6, 1.05, 0.06, 1.05, mats.goldSoft, false);
  }
  strip(ag, 0, 3.45, -19.5, 18, 0.1);
  strip(ag, 0, 3.45, -13.4, 18, 0.1);
  label(ag, 'Atrium & reception', 0, H + 4.6, -16.5, 5.6);


  /* ---- FILM STAGE (x 12..39, z -22..-11), double height ------------- */
  const fg = new THREE.Group(); nbG.add(fg);
  room('media', 'Film & digital media stage', fg, 25.5, -16.5, 27, 11);
  const FST_H = 8.0;
  // taller exterior envelope for the stage, continuing above the eaves line
  box(fg, 25.5, H, -21.83, 27.2, FST_H - H, 0.3, mats.wall);            // rear (north)
  box(fg, 38.85, H, -16.5, 0.3, FST_H - H, 11.0, mats.wall);            // east
  box(fg, 12.15, H, -16.5, 0.3, FST_H - H, 11.0, mats.wall);            // west (party wall)
  // clerestory glazing band on the courtyard side
  const clere = new THREE.Mesh(boxGeo(26.4, 1.7, 0.05), glassMat);
  clere.position.set(25.5, H + 1.2, -11.15); fg.add(clere);
  box(fg, 25.5, H, -11.0, 26.6, 0.5, 0.28, mats.wall);
  box(fg, 25.5, H + 2.9, -11.0, 26.6, 0.55, 0.28, mats.wall);
  for (let i = 0; i <= 10; i++) box(fg, 12.5 + i * 2.6, H, -11.0, 0.1, 2.9, 0.32, mats.beam);
  // black interior linings
  box(fg, 25.5, 0, -21.6, 26.4, FST_H - 0.3, 0.16, mats.black);
  box(fg, 38.6, 0, -16.5, 0.16, FST_H - 0.3, 10.6, mats.black);
  box(fg, 12.35, 0, -16.5, 0.16, FST_H - 0.3, 10.6, mats.black);
  // stage deck + cyc wall (vertical wall with a curved floor cove)
  box(fg, 20.0, 0, -19.4, 8.4, 0.45, 4.8, mats.dark);                  // stage deck
  box(fg, 20.0, 0.45, -19.4, 8.0, 0.05, 4.4, mats.cream, false);        // deck surface
  box(fg, 20.0, 0.45, -21.3, 7.8, 6.4, 0.14, mats.cream);              // cyc face
  const coveC = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 7.8, 16, 1, true, 0, Math.PI / 2), mats.cream);
  coveC.rotation.z = Math.PI / 2; coveC.rotation.y = 0;
  coveC.position.set(20.0, 0.45, -20.75); fg.add(coveC);               // cove at the wall base
  box(fg, 20.0, 0.45, -14.2, 7.8, 0.06, 0.3, mats.gold, false);        // stage edge
  // lighting grid over the stage
  for (let i = 0; i < 3; i++) box(fg, 25.5, 6.6 + i * 0.5, -16.5, 26.0, 0.07, 0.07, mats.dark);
  for (let i = 0; i < 6; i++) {
    const x = 14.5 + i * 3.6;
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.32, 10), mats.dark);
    lamp.position.set(x, 6.5, -12.9); lamp.rotation.x = 0.4; fg.add(lamp);
    /* Only the two outer lamps carry a real spot; the rest are geometry.
       Six overlapping spots on a small stage were the single most expensive
       thing in this scene and added almost nothing visually. */
    if (i === 0 || i === 5) {
      const spot = new THREE.SpotLight(0xffe0a8, 7, 15, 0.42, 0.62, 1.5);
      spot.position.set(x, 6.5, -12.9); spot.target.position.set(x, 0.6, -18.6);
      fg.add(spot, spot.target);
    }
  }
  // dolly track + camera
  box(fg, 25.5, 0.46, -12.9, 16, 0.05, 0.14, mats.gold, false);
  const camG = new THREE.Group(); camG.position.set(27.5, 0, -12.9); fg.add(camG);
  box(camG, 0, 0, 0, 0.5, 0.1, 0.5, mats.dark);
  box(camG, 0, 0.1, 0, 0.1, 1.3, 0.1, mats.dark);
  box(camG, 0, 1.4, 0, 0.42, 0.3, 0.52, mats.dark);
  box(camG, 0, 1.4, 0.28, 0.28, 0.24, 0.06, mats.screen, false);
  box(camG, 0, 1.62, -0.1, 0.18, 0.14, 0.2, mats.dark);
  // edit bays along the east wall
  desk(fg, 35.6, -19.0, 2.0, Math.PI / 2);
  monitor(fg, 35.6, 1.12, -19.8, 0.85); monitor(fg, 35.6, 1.12, -18.6, 0.85);
  chair(fg, 34.4, -19.2, -Math.PI / 2);
  // green room / prop store volume
  box(fg, 33.6, 0, -13.9, 6.0, 3.0, 2.6, mats.wallIn);
  box(fg, 33.6, 3.0, -13.9, 6.2, 0.14, 2.8, mats.dark);
  for (let i = 0; i < 3; i++) box(fg, 14.8 + i * 1.5, 0, -13.4, 0.7, 1.2, 0.7, mats.plinth);
  // stage roof + trim
  const filmRoof = box(fg, 25.5, FST_H, -16.5, 27.6, 0.34, 11.4, mats.roof);
  const filmTrim = box(fg, 25.5, FST_H - 0.1, -16.5, 27.9, 0.1, 11.7, mats.gold, false);
  roofs.push(filmRoof, filmTrim);
  // practical worklights + exit strip in the black box
  strip(fg, 32.0, 4.2, -19.9, 10, 0.08);
  strip(fg, 25.5, 0.5, -11.6, 22, 0.05, 0.04);
  label(fg, 'Film stage', 25.5, FST_H + 0.9, -16.5, 4.8);

  /* ---- PHOTO STUDIO (south-west: x -29..-13, z 15..26) ------------- */
  const pg = new THREE.Group(); sbG.add(pg);
  room('photo', 'Photography & visual arts studio', pg, -21, 20.5, 16, 11);
  // studio ceiling so the room reads as a room from above
  const pCeil = box(pg, -21, 4.05, 20.5, 16.2, 0.14, 10.4, mats.wallIn, false);
  roofs.push(pCeil);
  // seamless cove: tall backdrop wall that curves into the floor
  const cove = new THREE.Group(); cove.position.set(-21, 0, 25.6); pg.add(cove);
  const COVE_R = 1.05, COVE_W = 8.6;
  // vertical face
  box(cove, 0, COVE_R, 0, COVE_W, 3.4 - COVE_R, 0.14, mats.cream);
  // quarter-cylinder sweep from wall to floor (axis along X)
  const sweep = new THREE.Mesh(
    new THREE.CylinderGeometry(COVE_R, COVE_R, COVE_W, 18, 1, true, Math.PI, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xF0EAD9, roughness: 0.95, side: THREE.DoubleSide })
  );
  sweep.rotation.z = Math.PI / 2;
  sweep.position.set(0, COVE_R, -COVE_R);
  cove.add(sweep);
  // seamless paper roll at the cove base
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, COVE_W, 12), mats.cream);
  roll.rotation.z = Math.PI / 2; roll.position.set(-21, 3.2, 25.75); pg.add(roll);

  // key light: large softbox on a boom, aimed at the cove
  const keyStand = new THREE.Group(); keyStand.position.set(-25.4, 0, 21.8); pg.add(keyStand);
  box(keyStand, 0, 0, 0, 0.7, 0.06, 0.7, mats.dark);
  box(keyStand, 0, 0.06, 0, 0.08, 2.3, 0.08, mats.dark);
  const softbox = box(keyStand, 0, 2.36, 0, 1.5, 1.5, 0.35, mats.plinth);
  softbox.rotation.y = 0.55; softbox.rotation.x = -0.18;
  box(keyStand, 0, 2.36, 0.2, 1.4, 1.4, 0.02, mats.cream, false).rotation.y = 0.55;
  const keyLight = new THREE.PointLight(0xfff3de, 2.2, 13, 2);
  keyLight.position.set(-25.0, 2.6, 22.3); pg.add(keyLight);
  // fill: white umbrella, camera left
  const fillStand = new THREE.Group(); fillStand.position.set(-16.4, 0, 22.2); pg.add(fillStand);
  box(fillStand, 0, 0, 0, 0.62, 0.05, 0.62, mats.dark);
  box(fillStand, 0, 0.05, 0, 0.07, 2.1, 0.07, mats.dark);
  const umb = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.3), mats.cream);
  umb.position.set(0, 2.5, 0); umb.rotation.x = -0.9; fillStand.add(umb);
  // overhead scrim on a frame
  box(pg, -21, 3.2, 22.6, 8.8, 0.07, 0.07, mats.dark);
  box(pg, -21, 3.0, 22.6, 7.4, 0.02, 2.2, new THREE.MeshStandardMaterial({ color: 0xF7F2E6, transparent: true, opacity: 0.6, roughness: 1 }), false);
  // camera + tripod on set
  const cameraRig = new THREE.Group(); cameraRig.position.set(-21, 0, 19.2); pg.add(cameraRig);
  for (const [dx, dz] of [[-0.4, 0.3], [0.4, 0.3], [0, -0.45]]) box(cameraRig, dx, 0, dz, 0.05, 1.2, 0.05, mats.dark);
  box(cameraRig, 0, 1.2, 0, 0.16, 0.1, 0.16, mats.dark);
  box(cameraRig, 0, 1.3, 0, 0.34, 0.26, 0.42, mats.dark);
  box(cameraRig, 0, 1.3, 0.24, 0.22, 0.2, 0.12, mats.black);
  // props: apple boxes, stool, reflector
  box(pg, -19.2, 0, 20.4, 0.7, 0.3, 0.5, mats.timber);
  box(pg, -19.0, 0.3, 20.4, 0.5, 0.25, 0.36, mats.timber);
  box(pg, -23.2, 0, 20.6, 0.08, 0.62, 0.08, mats.dark);
  box(pg, -23.2, 0.62, 20.6, 0.42, 0.06, 0.42, mats.timberDark);
  const refl = box(pg, -18.2, 0.9, 23.0, 0.06, 1.1, 0.8, mats.cream, false);
  refl.rotation.z = 0.2;
  // print wall + edit desk in the east bay
  box(pg, -13.35, 0, 20.5, 0.16, 3.4, 10.4, mats.wallIn);
  for (let i = 0; i < 6; i++) {
    const px = -17.4 + (i % 3) * 1.5, py = 1.5 + Math.floor(i / 3) * 1.1;
    box(pg, px, py, 16.2, 1.15, 0.85, 0.06, mats.timberDark, false);
    box(pg, px, py + 0.06, 16.24, 1.0, 0.72, 0.03, mats.cream, false);
  }
  desk(pg, -15.4, 24.4, 1.6, Math.PI);
  monitor(pg, -15.4, 1.12, 24.1, 0.8);
  chair(pg, -15.4, 23.4, 0);
  plant(pg, -27.9, 15.9, 1.0);
  strip(pg, -21, 3.4, 21.0, 14, 0.1);
  strip(pg, -21, 3.4, 24.2, 14, 0.1);
  label(pg, 'Photography studio', -21, H + 1.1, 20.5, 5.4);

  /* ---- RECEPTION / LEARNING (south-centre: x -13..13) -------------- */
  const lg = new THREE.Group(); sbG.add(lg);
  room('learn', 'Learning & training pavilion', lg, 0, 20.5, 26, 11);
  // two teaching rooms either side of the entrance foyer
  box(lg, -8.6, 0, 20.5, 0.22, H, 10.6, mats.wallIn);
  box(lg, 8.6, 0, 20.5, 0.22, H, 10.6, mats.wallIn);
  // training room (west): banks of desks facing a screen
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    desk(lg, -11.4 + c * 2.0, 19.4 + r * 2.2, 1.4);
    monitor(lg, -11.4 + c * 2.0, 1.05, 19.15 + r * 2.2, 0.7);
    chair(lg, -11.4 + c * 2.0, 18.7 + r * 2.2, Math.PI);
  }
  box(lg, -11.0, 1.6, 25.7, 4.6, 2.2, 0.09, mats.screen, false);
  // seminar room (east): boardroom table
  box(lg, 11.4, 0.72, 20.5, 2.4, 0.08, 6.4, mats.timber);
  for (const dz of [-2.6, -0.9, 0.9, 2.6]) { chair(lg, 10.0, 20.5 + dz, Math.PI / 2); chair(lg, 12.8, 20.5 + dz, -Math.PI / 2); }
  box(lg, 11.4, 1.5, 25.6, 3.6, 2.0, 0.09, mats.screen, false);
  // foyer with seating between the two rooms
  box(lg, 0, 0, 22.0, 3.6, 0.44, 1.3, mats.fabric);
  plant(lg, -2.4, 24.6, 1.1); plant(lg, 2.4, 24.6, 1.1);
  strip(lg, -11.0, 3.2, 18.6, 10, 0.1);
  strip(lg, -11.0, 3.2, 23.4, 10, 0.1);
  strip(lg, 11.0, 3.2, 20.5, 9, 0.1);
  label(lg, 'Learning pavilion', 0, H + 1.1, 20.5, 5.2);

  /* ---- ENTERPRISE STUDIOS (south-east: x 13..29) ------------------- */
  const eg = new THREE.Group(); sbG.add(eg);
  room('enterprise', 'Enterprise studios', eg, 21, 20.5, 16, 11);
  // open co-working with clusters + two glass-walled start-up rooms
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    desk(eg, 16.4 + c * 2.6, 16.9 + r * 2.6, 2.0);
    monitor(eg, 16.4 + c * 2.6, 1.05, 16.6 + r * 2.6, 0.72);
    monitor(eg, 16.4 + c * 2.6, 1.05, 17.2 + r * 2.6, 0.72);
    chair(eg, 16.4 + c * 2.6, 17.6 + r * 2.6, Math.PI);
  }
  // glass start-up rooms against the rear wall
  for (const rx of [25.2, 27.6]) {
    box(eg, rx, 0, 23.4, 2.2, 2.6, 3.6, mats.wallIn);
    const gp = new THREE.Mesh(boxGeo(2.1, 2.3, 0.05), glassMat);
    gp.position.set(rx, 1.4, 21.6); eg.add(gp);
    box(eg, rx, 2.6, 23.4, 2.3, 0.12, 3.7, mats.dark);
  }
  // collaboration island + whiteboard wall
  box(eg, 21.5, 0, 22.4, 3.0, 0.74, 1.2, mats.timber);
  chair(eg, 20.4, 21.5, 0); chair(eg, 22.6, 21.5, 0);
  box(eg, 15.0, 1.0, 25.8, 3.6, 1.6, 0.07, mats.cream, false);
  strip(eg, 20.5, 3.2, 17.6, 12, 0.1);
  strip(eg, 20.5, 3.2, 21.4, 12, 0.1);
  label(eg, 'Enterprise studios', 21, H + 1.1, 20.5, 5.2);

  /* ------------------------------------------------------------------ *
   * Interior floors — every room gets a real screed slab on the plinth
   * ------------------------------------------------------------------ */
  const FLOOR = 0.45;
  const floors = [
    [mg, -25.5, -16.5, 26.9, 10.8, mats.wallIn],   // music
    [ag, 0, -16.5, 23.9, 10.8, mats.cream],        // atrium
    [fg, 25.5, -16.5, 26.9, 10.8, mats.black],     // film stage
    [pg, -21, 20.5, 16.9, 10.8, mats.wallIn],      // photo
    [lg, 0, 20.5, 25.9, 10.8, mats.wallIn],        // learning
    [eg, 21, 20.5, 16.9, 10.8, mats.wallIn]        // enterprise
  ];
  floors.forEach(([grp, x, z, w, d, mat]) => {
    // group is already lifted by FLOOR, so draw the slab from -FLOOR to 0
    box(grp, x, -FLOOR, z, w, FLOOR, d, mat, false);
  });
  // corridor floors inside the wings (so circulation reads under the colonnade)
  box(wwG, -30.6, 0, 2, 3.2, FLOOR, 25.6, mats.cream, false);
  box(ewG, 30.6, 0, 2, 3.2, FLOOR, 25.6, mats.cream, false);
  [mg, ag, fg, pg, lg, eg].forEach(g => { g.position.y = FLOOR; });
  // suspended ceilings for each enclosed room (part of the roof set)
  const ceilings = [
    [mg, -25.5, -16.5, 26.6, 10.6], [fg, 25.5, -16.5, 26.6, 10.6],
    [lg, 0, 20.5, 25.6, 10.6], [eg, 21, 20.5, 16.6, 10.6]
  ];
  ceilings.forEach(([grp, x, z, w, d]) => {
    const c = box(grp, x, H - 1.15, z, w, 0.12, d, mats.wallIn, false);
    roofs.push(c);
  });

  // courtyard door thresholds
  [[-22.75, -10.95], [22.75, -10.95], [0, 14.95], [0, 26.95], [-29.1, 20.5], [29.1, 20.5]].forEach(([x, z]) => {
    box(root, x, 0, z, 2.6, FLOOR, 1.0, mats.paving2);
  });

  /* ------------------------------------------------------------------ *
   * Landscape furniture
   * ------------------------------------------------------------------ */
  // benches around the courtyard
  for (const [bx, bz, rot] of [[-9.5, 8.4, 0], [9.5, 8.4, 0], [-9.5, -5.6, Math.PI], [9.5, -5.6, Math.PI]]) {
    const b = new THREE.Group(); b.position.set(bx, 0, bz); b.rotation.y = rot; root.add(b);
    box(b, 0, 0.42, 0, 3.0, 0.1, 0.6, mats.timber);
    for (const dx of [-1.3, 1.3]) box(b, dx, 0, 0, 0.1, 0.42, 0.5, mats.dark);
  }
  // promenade lights along the forecourt
  for (let i = 0; i < 6; i++) {
    for (const sx of [-1, 1]) {
      const x = sx * (7 + i * 3.6), z = 15.4;
      box(root, x, 0, z, 0.09, 3.2, 0.09, mats.dark);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mats.bulb);
      lamp.position.set(x, 3.25, z); root.add(lamp);
    }
  }
  // flag/identity mast at the entry
  box(root, -10.5, 0, 26.6, 0.22, 9.0, 0.22, mats.gold);
  box(root, -10.5, 0, 26.6, 0.9, 0.4, 0.9, mats.plinth);

  /* ------------------------------------------------------------------ *
   * Time of day — day / dusk / night
   * ------------------------------------------------------------------ */
  const interiorLights = [];
  scene.traverse(o => {
    if (o.isPointLight || o.isSpotLight) {
      interiorLights.push({ light: o, base: o.intensity });
    }
  });
  const daylightLights = [{ light: sun, base: sun.intensity }, { light: fill, base: fill.intensity }];

  const TIMES = {
    day: {
      bg: 0x0D2233, fogNear: 70, fogFar: 260,
      sun: new THREE.Color(0xffe2b0), sunI: 2.5, sunPos: [-38, 44, 26],
      hemiSky: new THREE.Color(0xd3e6f3), hemiGround: new THREE.Color(0x33402f), hemiI: 1.25,
      fill: new THREE.Color(0x9cc6de), fillI: 0.55,
      glass: new THREE.Color(0x9fc4d6), glassEm: 0x000000, glassEmI: 0,
      interiorMul: 0.55, label: 0.9
    },
    dusk: {
      bg: 0x2A1E28, fogNear: 60, fogFar: 240,
      sun: new THREE.Color(0xff9d5c), sunI: 2.0, sunPos: [-46, 15, 34],
      hemiSky: new THREE.Color(0xE0A98A), hemiGround: new THREE.Color(0x3A2E28), hemiI: 1.0,
      fill: new THREE.Color(0x7d8fb8), fillI: 0.6,
      glass: new THREE.Color(0xE8B98A), glassEm: 0xFFB877, glassEmI: 0.5,
      interiorMul: 2.1, label: 1.0
    },
    night: {
      bg: 0x04080F, fogNear: 55, fogFar: 230,
      sun: new THREE.Color(0x8FA9D6), sunI: 0.22, sunPos: [-30, 30, -24],
      hemiSky: new THREE.Color(0x2A3B55), hemiGround: new THREE.Color(0x141A20), hemiI: 0.55,
      fill: new THREE.Color(0x5C7EA8), fillI: 0.25,
      glass: new THREE.Color(0xFFD49A), glassEm: 0xFFC078, glassEmI: 1.5,
      interiorMul: 3.4, label: 1.0
    }
  };
  const hemi = scene.children.find(o => o.isHemisphereLight);
  const ambient = scene.children.find(o => o.isAmbientLight);
  let timeMode = 'day';

  function applyTime(mode) {
    const t = TIMES[mode] || TIMES.day;
    timeMode = mode;
    scene.background.set(t.bg);
    scene.fog.color.set(t.bg);
    scene.fog.near = t.fogNear; scene.fog.far = t.fogFar;
    sun.color.copy(t.sun); sun.intensity = t.sunI; sun.position.set(...t.sunPos);
    fill.color.copy(t.fill); fill.intensity = t.fillI;
    if (hemi) { hemi.color.copy(t.hemiSky); hemi.groundColor.copy(t.hemiGround); hemi.intensity = t.hemiI; }
    if (ambient) ambient.intensity = mode === 'night' ? 0.16 : 0.35;
    daylightLights[0].base = t.sunI; daylightLights[1].base = t.fillI;
    glassMat.color.copy(t.glass);
    glassMat.emissive.set(t.glassEm);
    glassMat.emissiveIntensity = t.glassEmI;
    interiorLights.forEach(({ light, base }) => { light.intensity = base * t.interiorMul; });
    document.querySelectorAll('[data-time]').forEach(b => b.classList.toggle('active', b.dataset.time === mode));
    const el = document.getElementById('campus-mode');
    if (el) {
      const label = mode === 'day' ? 'Daylight' : mode === 'dusk' ? 'Golden hour' : 'Evening / lit';
      el.textContent = label + ' · ' + (roofsVisible ? 'roof on' : 'cutaway');
    }
  }
  document.querySelectorAll('[data-time]').forEach(b => b.addEventListener('click', () => applyTime(b.dataset.time)));

  /* ------------------------------------------------------------------ *
   * Hover highlight
   * ------------------------------------------------------------------ */
  const hoverMat = new THREE.LineBasicMaterial({ color: 0xF0D79E, transparent: true, opacity: 0.95 });
  const hoverBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), hoverMat);
  hoverBox.visible = false;
  hoverBox.renderOrder = 5;
  scene.add(hoverBox);
  const roomBounds = {};
  Object.entries(roomGroups).forEach(([id, grp]) => {
    const b = new THREE.Box3().setFromObject(grp);
    roomBounds[id] = b;
  });

  /* ------------------------------------------------------------------ *
   * Views, focus, picking
   * ------------------------------------------------------------------ */
  const names = {
    hub: 'Central atrium & reception',
    music: 'Music & sound wing',
    media: 'Film & digital media stage',
    photo: 'Photography & visual arts studio',
    learn: 'Learning & training pavilion',
    enterprise: 'Enterprise studios'
  };
  const views = {
    hub: { pos: [0, 15, 10], target: [0, 3.0, -16] },
    music: { pos: [-24, 16, 2], target: [-27.5, 2.0, -16.5] },
    media: { pos: [24, 16, 2], target: [27, 2.5, -17] },
    photo: { pos: [-21, 13, 13], target: [-21, 1.8, 22] },
    learn: { pos: [0, 13, 14], target: [0, 1.8, 21.5] },
    enterprise: { pos: [21, 12, 14], target: [21, 1.8, 21.5] }
  };
  const descriptions = {
    hub: 'A double-height entrance atrium with reception, a mezzanine, a digital feature wall and a skylight lantern above. Every programme area is reached from here, so the building works as one institution rather than a set of studios.',
    music: 'Three linked spaces: a control room with console and outboard rack, a live room with piano and drum kit, and an acoustically isolated vocal booth. The highest-fit-out cost line in the budget, and the first to open.',
    media: 'A true black-box stage with a curved cyc wall, lighting grid, dolly track and camera position, plus edit bays and a green room. Built with a double-height volume and blackout capability.',
    photo: 'A daylight-and-strobe studio with a seamless cove backdrop, overhead frame and scrim, softboxes on stands, prop store and a framed print wall for portfolio and exhibition work.',
    learn: 'Two teaching rooms either side of a shared foyer: a 9-station digital training room with a projection wall, and a seminar room for mentorship, business skills and partner sessions.',
    enterprise: 'Open co-working desks plus two glass-walled start-up rooms for incubated creative businesses — the step between training and independent, revenue-earning work.'
  };

  let camGoal = null, targetGoal = null;
  const $ = id => document.getElementById(id);

  function setCutaway(on) {
    roofsVisible = !on;
    roofs.forEach(o => { o.visible = !on; });
    if (roofBtn) roofBtn.textContent = on ? 'Show roof / exterior' : 'Show floor plan (cutaway)';
  }

  function focus(id) {
    const v = views[id] || views.hub;
    setCutaway(true);              // you cannot look into a room through a roof
    controls.minDistance = 2.5;
    camGoal = new THREE.Vector3(...v.pos);
    targetGoal = new THREE.Vector3(...v.target);
    $('room-title').textContent = names[id];
    $('room-desc').textContent = descriptions[id];
    document.querySelectorAll('.pill-tabs button').forEach(b => b.classList.toggle('active', b.dataset.room === id));
    $('campus-mode').textContent = names[id].replace(' & ', ' · ').replace(' wing', '').replace(' studio', '') + ' focus';
  }
  window.ucicFocusRoom = focus;
  document.querySelectorAll('[data-room]').forEach(b => b.addEventListener('click', () => focus(b.dataset.room)));

  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let down = null, hoverRaf = 0;

  canvas.addEventListener('pointermove', e => {
    if (hoverRaf) return;
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0;
      const r = canvas.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (hit) {
        const id = hit.object.userData.room;
        const b = roomBounds[id];
        if (b) {
          const size = new THREE.Vector3(), centre = new THREE.Vector3();
          b.getSize(size); b.getCenter(centre);
          hoverBox.position.copy(centre);
          hoverBox.scale.set(size.x + 0.25, size.y + 0.25, size.z + 0.25);
          hoverBox.visible = true;
        }
        canvas.style.cursor = 'pointer';
      } else {
        hoverBox.visible = false;
        canvas.style.cursor = 'grab';
      }
    });
  });
  canvas.addEventListener('pointerleave', () => { hoverBox.visible = false; });

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

  /* ------------------------------------------------------------------ *
   * Cutaway / section control
   * ------------------------------------------------------------------ */
  let roofsVisible = true;
  const roofBtn = $('roof-toggle');
  roofBtn.addEventListener('click', () => {
    stopTour();
    roofsVisible = !roofsVisible;
    roofs.forEach(o => { o.visible = roofsVisible; });
    roofBtn.textContent = roofsVisible ? 'Show floor plan (cutaway)' : 'Show roof / exterior';
    $('campus-mode').textContent = roofsVisible ? 'Exterior · roof on' : 'Cutaway · plan view';
  });

  $('inside-toggle').addEventListener('click', () => {
    stopTour();
    setCutaway(false);            // keep the building intact — we are standing inside it
    document.querySelectorAll('.pill-tabs button').forEach(b => b.classList.toggle('active', b.dataset.room === 'music'));
    $('room-title').textContent = names.music;
    $('room-desc').textContent = descriptions.music;
    controls.minDistance = 0.4;
    camGoal = new THREE.Vector3(-26.2, 1.65, -12.6);
    targetGoal = new THREE.Vector3(-31.5, 1.25, -18.0);
    $('campus-mode').textContent = 'Inside the control room';
  });

  const autoBtn = $('auto-toggle');
  autoBtn.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    autoBtn.setAttribute('aria-pressed', String(controls.autoRotate));
    autoBtn.textContent = 'Auto-orbit: ' + (controls.autoRotate ? 'On' : 'Off');
  });

  $('reset-campus').addEventListener('click', () => {
    stopTour();
    roofs.forEach(o => { o.visible = true; });
    roofsVisible = true;
    roofBtn.textContent = 'Show floor plan (cutaway)';
    controls.minDistance = 3;
    camGoal = HOME.pos.clone();
    targetGoal = HOME.target.clone();
    $('campus-mode').textContent = 'Exterior overview';
    $('room-title').textContent = 'Campus overview';
    $('room-desc').textContent = 'A single-storey U-plan building: a north production block, two teaching wings and a south entrance block, wrapped around a courtyard and continuous colonnade. 1,000–1,200 m² of usable space.';
    document.querySelectorAll('.pill-tabs button').forEach(b => b.classList.remove('active'));
  });

  /* ------------------------------------------------------------------ *
   * Guided tour
   * ------------------------------------------------------------------ */
  const tourOrder = ['hub', 'music', 'media', 'photo', 'learn', 'enterprise'];
  const tourCopy = {
    hub: 'We start in the double-height atrium — reception, mezzanine and the skylight lantern over the courtyard side.',
    music: 'West of the atrium: control room, live room and vocal booth — the first facilities to open.',
    media: 'East of the atrium, the black-box film stage with its cyc wall, lighting grid and dolly track.',
    photo: 'Across the courtyard, the photography studio with its seamless cove and lighting rig.',
    learn: 'The south block teaching rooms: a digital training room and a seminar room.',
    enterprise: 'And the enterprise studios, where trained creatives move into paid, independent work.'
  };
  let tourTimer = null, tourIdx = 0;
  const tourBtn = $('tourBtn');
  function stopTour() {
    if (tourTimer) { clearInterval(tourTimer); tourTimer = null; }
    if (tourBtn) tourBtn.textContent = '▶ Start the guided 3D tour';
  }
  function tourStep() {
    const id = tourOrder[tourIdx % tourOrder.length];
    focus(id);
    const n = (tourIdx % tourOrder.length) + 1;
    $('campus-mode').textContent = `Guided tour ${n}/6 · ${names[id]}`;
    $('room-desc').textContent = tourCopy[id];
    tourIdx++;
  }
  if (tourBtn) tourBtn.addEventListener('click', () => {
    if (tourTimer) { stopTour(); return; }
    roofs.forEach(o => { o.visible = false; });
    roofsVisible = false;
    roofBtn.textContent = 'Show roof / exterior';
    tourIdx = 0;
    tourStep();
    tourTimer = setInterval(tourStep, 5600);
    tourBtn.textContent = '⏸ Stop tour';
  });
  canvas.addEventListener('pointerdown', () => stopTour());

  /* ------------------------------------------------------------------ *
   * Resize / render loop
   * ------------------------------------------------------------------ */
  let onScreen = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }, { rootMargin: '150px' }).observe(canvas);
  }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    controls.autoRotate = false;
  }

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

  /* Shadow-pass thinning.
   *
   * box() defaults to castShadow = true, so nearly a thousand meshes — down to
   * 0.1 m chair legs and cable runs — were submitted to the 2048² shadow map.
   * At campus scale those shadows are sub-pixel, so they cost a full extra
   * pass for nothing. Anything smaller than ~0.6 m stops casting; silhouettes
   * come from the walls, roofs, columns and furniture that actually read. */
  if (renderer.shadowMap.enabled) {
    const MIN_CASTER = 0.6;
    const _box = new THREE.Box3();
    const _size = new THREE.Vector3();
    scene.traverse(o => {
      if (!o.isMesh || !o.castShadow) return;
      _box.setFromObject(o);
      _box.getSize(_size);
      if (Math.max(_size.x, _size.y, _size.z) < MIN_CASTER) o.castShadow = false;
    });
  }

  applyTime('day');

  const loading = $('campus-loading');
  if (loading) {
    const txt = loading.querySelector ? loading.querySelector('.cl-text') : null;
    if (txt) txt.textContent = '3D campus ready · click a wing or start the tour';
    else loading.textContent = '3D campus ready · click a wing or start the tour';
  }
  const sceneWrap = canvas.closest('.campus-scene');
  if (sceneWrap) sceneWrap.classList.add('ready');

  function animate() {
    requestAnimationFrame(animate);
    if (!onScreen) return;
    if (camGoal) {
      camera.position.lerp(camGoal, 0.055);
      controls.target.lerp(targetGoal, 0.055);
      if (camera.position.distanceTo(camGoal) < 0.04) { camGoal = null; targetGoal = null; }
    }
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
