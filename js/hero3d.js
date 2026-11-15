/* UCIC — Hero 3D background: particle field + wireframe campus massing */
import * as THREE from 'three';

const canvas = document.getElementById('hero3d');
if (canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 4, 14);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  // Gold particle field
  const COUNT = 900;
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const gold = new THREE.Color(0xd8b36a);
  const teal = new THREE.Color(0x5b9c9b);
  const cream = new THREE.Color(0xf0d79e);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 18;
    const c = Math.random() < 0.7 ? gold : (Math.random() < 0.5 ? teal : cream);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true }));
  scene.add(particles);

  // Wireframe massing blocks (abstract campus)
  const wireMat = new THREE.MeshBasicMaterial({ color: 0xd8b36a, wireframe: true, transparent: true, opacity: 0.16 });
  const blocks = new THREE.Group();
  const defs = [[-6, 1, -2, 3, 2, 2.4], [0, 1.5, -1, 3.4, 3, 2.8], [5.5, 0.8, -2, 2.6, 1.6, 2.2], [-3, 0.6, 2.5, 2.2, 1.2, 2], [3.5, 0.6, 2.5, 2.4, 1.2, 2]];
  defs.forEach(d => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(d[3], d[4], d[5]), wireMat);
    m.position.set(d[0], d[1], d[2]);
    blocks.add(m);
  });
  blocks.position.set(2, -1.5, -4);
  scene.add(blocks);

  // Slow rotating torus ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 0.02, 8, 120), new THREE.MeshBasicMaterial({ color: 0xd8b36a, transparent: true, opacity: 0.25 }));
  ring.rotation.x = Math.PI / 2.4;
  ring.position.set(4, 1, -6);
  scene.add(ring);

  let mx = 0, my = 0;
  window.addEventListener('pointermove', e => {
    mx = (e.clientX / innerWidth - 0.5);
    my = (e.clientY / innerHeight - 0.5);
  }, { passive: true });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    particles.rotation.y = t * 0.02;
    particles.position.y = Math.sin(t * 0.3) * 0.3;
    blocks.rotation.y = t * 0.05;
    ring.rotation.z = t * 0.08;
    camera.position.x += (mx * 2.2 - camera.position.x) * 0.03;
    camera.position.y += (4 - my * 1.6 - camera.position.y) * 0.03;
    camera.lookAt(0, 0.5, 0);
    renderer.render(scene, camera);
  }
  animate();
}
