/* UCIC — Hero visual: a spinning vinyl record with a live audio waveform.
 * Deliberately music-first: no abstract particles, no wireframe geometry.
 */
import * as THREE from 'three';

const canvas = document.getElementById('hero3d');

if (canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffe0b0, 2.4);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fa8c8, 1.6);
  rim.position.set(-6, 2, -5);
  scene.add(rim);
  const warm = new THREE.PointLight(0xffb877, 2.2, 16, 2);
  warm.position.set(2, -2, 4);
  scene.add(warm);

  /* ---------- Vinyl record ---------- */
  const record = new THREE.Group();
  scene.add(record);

  const RADIUS = 2.05;

  // black vinyl body with fine grooves
  const vinyl = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIUS, RADIUS, 0.075, 128, 1),
    new THREE.MeshStandardMaterial({ color: 0x0A0C10, roughness: 0.34, metalness: 0.55 })
  );
  vinyl.rotation.x = Math.PI / 2;
  record.add(vinyl);

  // concentric groove rings (thin gold-ish lines catching the light)
  for (let i = 0; i < 34; i++) {
    const r = 0.78 + (i / 34) * (RADIUS - 0.88);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.006, 4, 128),
      new THREE.MeshBasicMaterial({ color: 0x9c8355, transparent: true, opacity: 0.42 })
    );
    record.add(ring);
  }

  // label — gold with a dark centre hole and a subtle rim
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.74, 0.74, 0.078, 64),
    new THREE.MeshStandardMaterial({ color: 0xC9A45F, roughness: 0.55, metalness: 0.2 })
  );
  label.rotation.x = Math.PI / 2;
  record.add(label);
  const labelInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.081, 64),
    new THREE.MeshStandardMaterial({ color: 0xB18F4C, roughness: 0.6, metalness: 0.15 })
  );
  labelInner.rotation.x = Math.PI / 2;
  record.add(labelInner);
  // spindle hole
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.09, 20),
    new THREE.MeshBasicMaterial({ color: 0x060D1A })
  );
  hole.rotation.x = Math.PI / 2;
  record.add(hole);

  // tonearm + stylus, so it reads unmistakably as a turntable
  const armMat = new THREE.MeshStandardMaterial({ color: 0xCFC9BA, roughness: 0.32, metalness: 0.8 });
  const arm = new THREE.Group();
  scene.add(arm);

  // pivot post, up and to the right of the record
  const pivotPos = new THREE.Vector2(RADIUS + 0.62, RADIUS - 0.30);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.62, 20), armMat);
  post.rotation.x = Math.PI / 2;
  post.position.set(pivotPos.x, pivotPos.y, -0.04);
  arm.add(post);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 22), armMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(pivotPos.x, pivotPos.y, 0.16);
  arm.add(collar);

  // the arm itself: a bar from the pivot across the grooves
  const headPos = new THREE.Vector2(RADIUS - 0.62, RADIUS - 1.62);
  const from = new THREE.Vector3(pivotPos.x, pivotPos.y, 0.12);
  const to = new THREE.Vector3(headPos.x, headPos.y, 0.12);
  const len = from.distanceTo(to);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, len, 10), armMat);
  bar.position.copy(from).lerp(to, 0.5);
  bar.rotation.z = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2;
  arm.add(bar);

  // headshell + stylus, sitting on the outer grooves
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.1), armMat);
  shell.position.set(headPos.x, headPos.y, 0.17);
  shell.rotation.z = Math.atan2(to.y - from.y, to.x - from.x) + 0.18;
  arm.add(shell);
  const stylus = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 8), armMat);
  stylus.position.set(headPos.x - 0.05, headPos.y - 0.06, 0.10);
  stylus.rotation.x = Math.PI;
  arm.add(stylus);

  /* ---------- Waveform ring: bars radiating from the record ---------- */
  const BARS = 132;
  const barGeo = new THREE.BoxGeometry(1, 1, 1);
  const barMat = new THREE.MeshStandardMaterial({
    color: 0xD8B36A, roughness: 0.42, metalness: 0.35,
    emissive: 0x6B4E18, emissiveIntensity: 0.5
  });
  const bars = new THREE.InstancedMesh(barGeo, barMat, BARS);
  bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(bars);

  const dummy = new THREE.Object3D();
  const heights = new Float32Array(BARS);
  const phases = new Float32Array(BARS);
  for (let i = 0; i < BARS; i++) {
    heights[i] = 0.3 + Math.random() * 0.7;
    phases[i] = Math.random() * Math.PI * 2;
  }

  /* ---------- Floating dust motes (subtle, warm) ---------- */
  const MOTES = 260;
  const pos = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i++) {
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 9;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
    pos[i * 3 + 2] = Math.sin(a) * r * 0.5 - 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xF0D79E, size: 0.045, transparent: true, opacity: 0.55, sizeAttenuation: true
  }));
  scene.add(motes);

  /* ---------- Layout (record sits right of the headline on wide screens) ---------- */
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w / h > 1.15;
    const scale = wide ? 0.85 : 0.62;
    record.position.set(wide ? 3.0 : 0, wide ? 0.15 : 1.5, 0);
    record.scale.setScalar(scale);
    arm.position.copy(record.position);
    arm.scale.setScalar(scale);
    camera.position.set(0, wide ? 1.4 : 3.6, wide ? 10.4 : 10.5);
    camera.lookAt(wide ? 1.5 : 0, 0, 0);
    camera.updateProjectionMatrix();
    heroOffset = wide ? 1 : 0;
  }
  let heroOffset = 0;

  let mx = 0, my = 0;
  window.addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth - 0.5;
    my = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(canvas);
  window.addEventListener('resize', layout);
  layout();

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // record spins like it is playing at 33⅓ rpm
    if (!reduce) record.rotation.z = -t * 0.55;

    // waveform bars swell in a travelling envelope
    const R = RADIUS + 0.26;
    for (let i = 0; i < BARS; i++) {
      const a = (i / BARS) * Math.PI * 2;
      const beat = reduce ? 0.5 : (
        0.5 + 0.5 * Math.sin(t * 2.2 + phases[i]) * 0.55 +
        0.45 * Math.sin(t * 5.1 + i * 0.35) * 0.35
      );
      const amp = 0.14 + Math.abs(beat) * 0.85 * heights[i];
      dummy.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      dummy.rotation.set(0, 0, a - Math.PI / 2);
      dummy.scale.set(0.045, amp, 0.045);
      dummy.updateMatrix();
      bars.setMatrixAt(i, dummy.matrix);
    }
    bars.instanceMatrix.needsUpdate = true;

    // gentle parallax with the pointer
    const tx = mx * 0.5 + heroOffset * 0.35;
    const ty = -my * 0.35;
    record.position.x += ((heroOffset ? 3.0 : 0) + tx - record.position.x) * 0.04;
    record.position.y += (0.15 + ty - record.position.y) * 0.04;
    arm.position.copy(record.position);
    motes.rotation.y = t * 0.02;

    renderer.render(scene, camera);
  }
  animate();
}

/* ------------------------------------------------------------------ *
 * Hero waveform strip — canvas, drawn to look like a DAW timeline
 * ------------------------------------------------------------------ */
(function heroWave() {
  const c = document.getElementById('heroWave');
  if (!c || typeof c.getContext !== 'function') return;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  let w = 0, h = 0, dpr = Math.min(devicePixelRatio || 1, 2);
  const N = 150;
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    // a musical-looking envelope: quiet intro, swell, breakdown, outro
    const env = Math.sin((i / N) * Math.PI) ** 1.4;
    seed[i] = env * (0.35 + Math.random() * 0.65);
  }
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t0 = performance.now();

  function size() {
    const r = c.getBoundingClientRect();
    w = r.width; h = c.clientHeight || 72;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(c);
  window.addEventListener('resize', size);
  size();

  function draw(now) {
    requestAnimationFrame(draw);
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);
    const mid = h / 2;
    const bw = w / N;
    for (let i = 0; i < N; i++) {
      const playhead = reduce ? 0.5 : (t * 0.10) % 1;
      const d = Math.abs(i / N - playhead);
      const live = Math.max(0, 1 - d * 7);            // brighter near the playhead
      const pulse = reduce ? 1 : (0.85 + 0.15 * Math.sin(t * 6 + i * 0.4));
      const v = seed[i] * pulse * (0.45 + live * 0.9);
      const bar = Math.max(1.2, v * mid * 1.8);
      const x = i * bw + bw * 0.22;
      const grad = ctx.createLinearGradient(0, mid - bar, 0, mid + bar);
      grad.addColorStop(0, `rgba(240,215,158,${0.35 + live * 0.6})`);
      grad.addColorStop(0.5, `rgba(216,179,106,${0.85 + live * 0.15})`);
      grad.addColorStop(1, `rgba(240,215,158,${0.3 + live * 0.55})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, mid - bar, Math.max(1, bw * 0.52), bar * 2);
    }
    // playhead
    const px = ((reduce ? 0.5 : (t * 0.10) % 1) * w);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(px, 0, 1, h);
  }
  requestAnimationFrame(draw);
})();
