/* UCIC — Campus fallback renderer (Canvas 2D, no WebGL).
 *
 * Why this exists: the full campus is WebGL. Brave's strict fingerprinting
 * protection, hardened Firefox settings, remote desktops and older GPUs all
 * refuse a WebGL context outright, which left the proposal showing an empty
 * box. Blocking WebGL is a legitimate privacy choice, so the answer is not
 * to tell the visitor to change their settings.
 *
 * This draws the same U-plan building with a real perspective projection,
 * on a plain 2D canvas, so it still orbits, zooms, focuses a wing and lights
 * itself for day / golden hour / evening. It is a genuine 3D projection —
 * geometry is projected, faces are depth-sorted and shaded by their normal —
 * just painted with paths instead of triangles on a GPU.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('campus3d');
  if (!canvas) return;

  const $ = id => document.getElementById(id);

  /* ------------------------------------------------------------------ *
   * Building geometry (metres), matching the WebGL plan
   * ------------------------------------------------------------------ */
  // Each volume: x/z centre, footprint, height, colour, room id
  const BLOCKS = [
    // north production block (rear)
    { x: -22, z: -16, w: 30, d: 11, h: 5.4, c: '#D9D3C3', room: 'music', label: 'Music' },
    { x: 2, z: -16, w: 20, d: 11, h: 6.6, c: '#E4DECE', room: 'hub', label: 'Atrium' },
    { x: 26, z: -16, w: 22, d: 11, h: 6.2, c: '#CFC8B6', room: 'media', label: 'Film' },
    // south entrance block (front)
    { x: -18, z: 20, w: 20, d: 11, h: 4.6, c: '#DCD6C6', room: 'photo', label: 'Photo' },
    { x: 0, z: 20, w: 16, d: 11, h: 5.6, c: '#EAE3D2', room: 'learn', label: 'Learning' },
    { x: 18, z: 20, w: 18, d: 11, h: 4.6, c: '#D6CFBD', room: 'enterprise', label: 'Enterprise' }
  ];
  // west / east wings linking the two blocks
  BLOCKS.push({ x: -39, z: 2, w: 10, d: 26, h: 4.8, c: '#D2CBBA', room: 'music', label: '' });
  BLOCKS.push({ x: 39, z: 2, w: 10, d: 26, h: 4.8, c: '#CEC7B5', room: 'media', label: '' });

  // courtyard footprint, drawn as a lighter paving slab
  const COURT = { x: 0, z: 2, w: 66, d: 22 };

  /* Roofs are their own tone. Using the wall colour for the top face made
     every block read as a plain white slab from above. */
  const ROOF = '#6E7C82';

  const ROOM_LABEL = {
    hub: 'Central atrium & reception',
    music: 'Music & sound wing',
    media: 'Film & digital media stage',
    photo: 'Photography & visual arts studio',
    learn: 'Learning & training pavilion',
    enterprise: 'Enterprise studios'
  };

  /* ------------------------------------------------------------------ *
   * Camera + state
   * ------------------------------------------------------------------ */
  const cam = {
    yaw: -0.62,      // radians, orbit around Y
    pitch: 0.52,     // radians above the ground plane
    dist: 108,       // distance from target
    tx: 0, ty: 2, tz: -1,  // target
    goalYaw: null, goalPitch: null, goalDist: null,
    goalTx: null, goalTy: null, goalTz: null
  };
  const HOME = { yaw: -0.62, pitch: 0.52, dist: 108, tx: 0, ty: 2, tz: -1 };

  /* Portrait screens need more distance to hold the whole plan. */
  function homeForViewport() {
    /* The building spans ~88 m wide and ~48 m deep. Pick the distance that
       fits it, with a margin, for the current aspect — one formula so neither
       desktop nor portrait phone gets cropped or lost in empty space. */
    const aspect = W / H;
    const dist = aspect >= 1.2 ? 118 : (aspect >= 0.85 ? 150 : 128);
    return Object.assign({}, HOME, { dist });
  }

  const MOODS = {
    day: {
      sky: ['#0E2C44', '#071A2B'], ground: '#33503F',
      sun: [0.55, 0.78, 0.32], light: 1.0, ambient: 0.52, warm: '#FFE7BE',
      fog: 'rgba(13,34,51,0)', line: 'rgba(255,255,255,.10)'
    },
    dusk: {
      sky: ['#3A2A38', '#141A2A'], ground: '#3A4636',
      sun: [0.86, 0.30, 0.22], light: 0.92, ambient: 0.40, warm: '#FFB877',
      fog: 'rgba(58,42,56,.0)', line: 'rgba(255,210,150,.14)'
    },
    night: {
      sky: ['#0A1622', '#04101A'], ground: '#1B2A26',
      sun: [0.20, 0.55, 0.72], light: 0.30, ambient: 0.26, warm: '#8FB6D8',
      fog: 'rgba(6,16,26,0)', line: 'rgba(150,200,240,.14)'
    }
  };
  let mood = 'day';
  let cutaway = false;      // hide roofs
  let autoRotate = false;
  let focusRoom = 'hub';
  let dragging = false, lastX = 0, lastY = 0, moved = 0;
  let raf = null;
  let ready = false;

  /* ------------------------------------------------------------------ *
   * Projection
   * ------------------------------------------------------------------ */
  let W = 1, H = 1, dpr = 1;

  function project(x, y, z) {
    // translate to target, rotate by yaw, then tilt by pitch, then perspective
    const dx = x - cam.tx, dy = y - cam.ty, dz = z - cam.tz;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const rx = dx * cy - dz * sy;
    const rz = dx * sy + dz * cy;

    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const ry = dy * cp - rz * sp;
    const rz2 = dy * sp + rz * cp + cam.dist;

    if (rz2 <= 1) return null;              // behind the camera
    /* Fit the frame: a portrait phone needs a longer distance, not a bigger
       crop. Without this the wings ran off both edges on mobile. */
    const fit = Math.min(1, (W / H) / 1.35);
    const f = 520;                           // focal length
    const scale = (f / rz2) * (Math.min(W, H) / 620) * 1.55 * (0.88 + 0.12 * fit);
    return {
      x: W / 2 + rx * scale,
      y: H / 2 - ry * scale,
      depth: rz2,
      scale
    };
  }

  /* Shade a face by the angle between its normal and the sun. */
  function shade(base, normal, kind) {
    const m = MOODS[mood];
    const s = m.sun;
    const len = Math.hypot(s[0], s[1], s[2]) || 1;
    const d = (normal[0] * s[0] + normal[1] * s[1] + normal[2] * s[2]) / len;
    const lit = Math.max(0, d);
    /* Cap the multiplier: sunlight on a horizontal roof used to clip to pure
       white, which flattened the massing into blank shapes. */
    const k = Math.min(1.06, m.ambient * 0.9 + lit * m.light * 0.82);
    return tint(kind === 'top' ? ROOF : base, k);
  }

  function tint(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (mood === 'dusk') { r = Math.min(255, r * 1.06 + 12); g = g * 0.94; b = b * 0.90; }
    if (mood === 'night') { r = r * 0.34 + 5; g = g * 0.40 + 9; b = b * 0.58 + 20; }
    if (mood === 'dusk') { r = Math.min(255, r * 1.04 + 8); }
    r = Math.max(0, Math.min(255, r * k));
    g = Math.max(0, Math.min(255, g * k));
    b = Math.max(0, Math.min(255, b * k));
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }

  /* ------------------------------------------------------------------ *
   * Face collection -> painter's algorithm
   * ------------------------------------------------------------------ */
  function boxFaces(b) {
    const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2;
    const z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
    const y0 = 0, y1 = b.h;
    const faces = [];

    const corners = {
      top: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
      north: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]],
      south: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
      west: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
      east: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]
    };
    const normals = {
      top: [0, 1, 0], north: [0, 0, -1], south: [0, 0, 1],
      west: [-1, 0, 0], east: [1, 0, 0]
    };

    for (const key in corners) {
      if (cutaway && key === 'top') continue;
      const pts = corners[key].map(p => project(p[0], p[1], p[2]));
      if (pts.some(p => !p)) continue;
      const depth = pts.reduce((a, p) => a + p.depth, 0) / pts.length;
      faces.push({
        pts, depth, kind: key, room: b.room,
        fill: shade(b.c, normals[key], key),
        block: b
      });
    }
    return faces;
  }

  function drawGround() {
    const m = MOODS[mood];
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, m.sky[0]);
    g.addColorStop(1, m.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // a large ground plane, drawn as a projected quad
    const R = 320;
    const quad = [[-R, 0, -R], [R, 0, -R], [R, 0, R], [-R, 0, R]]
      .map(p => project(p[0], p[1], p[2]));
    if (quad.every(Boolean)) {
      ctx.beginPath();
      ctx.moveTo(quad[0].x, quad[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(quad[i].x, quad[i].y);
      ctx.closePath();
      ctx.fillStyle = mood === 'night' ? '#16241F' : (mood === 'dusk' ? '#3C4636' : '#3E5A45');
      ctx.fill();
    }

    // faint grid to give the ground some scale
    ctx.strokeStyle = m.line;
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      const a = project(i * 20, 0, -60), b = project(i * 20, 0, 60);
      if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      const c = project(-60, 0, i * 20), d = project(60, 0, i * 20);
      if (c && d) { ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke(); }
    }
  }

  function drawCourtyard() {
    const pts = [
      [COURT.x - COURT.w / 2, 0.02, COURT.z - COURT.d / 2],
      [COURT.x + COURT.w / 2, 0.02, COURT.z - COURT.d / 2],
      [COURT.x + COURT.w / 2, 0.02, COURT.z + COURT.d / 2],
      [COURT.x - COURT.w / 2, 0.02, COURT.z + COURT.d / 2]
    ].map(p => project(p[0], p[1], p[2]));
    if (!pts.every(Boolean)) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = mood === 'night' ? '#2A3A34' : '#8E8B7C';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.stroke();
  }

  function drawFaces(faces) {
    faces.sort((a, b) => b.depth - a.depth);
    for (const f of faces) {
      ctx.beginPath();
      ctx.moveTo(f.pts[0].x, f.pts[0].y);
      for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i].x, f.pts[i].y);
      ctx.closePath();
      ctx.fillStyle = f.fill;
      ctx.fill();
      ctx.strokeStyle = 'rgba(12,24,36,.22)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  /* Windows: small warm rectangles on the wall faces, which is what makes the
     evening view read as "a building with studios in it" rather than a box. */
  function drawWindows(faces) {
    const lit = mood !== 'day';
    for (const f of faces) {
      if (f.kind === 'top') continue;
      const b = f.block;
      // only front-ish faces get windows
      if (f.kind !== 'south' && f.kind !== 'north' && f.kind !== 'west' && f.kind !== 'east') continue;
      const alongX = f.kind === 'south' || f.kind === 'north';
      const span = alongX ? b.w : b.d;
      const count = Math.max(2, Math.floor(span / 5));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        let wx, wz;
        if (alongX) {
          wx = b.x - b.w / 2 + span * t;
          wz = f.kind === 'south' ? b.z + b.d / 2 + 0.02 : b.z - b.d / 2 - 0.02;
        } else {
          wz = b.z - b.d / 2 + span * t;
          wx = f.kind === 'east' ? b.x + b.w / 2 + 0.02 : b.x - b.w / 2 - 0.02;
        }
        const yb = b.h * 0.34, yt = b.h * 0.62;
        const half = alongX ? 0.9 : 0.9;
        const p1 = alongX ? project(wx - half, yb, wz) : project(wx, yb, wz - half);
        const p2 = alongX ? project(wx + half, yb, wz) : project(wx, yb, wz + half);
        const p3 = alongX ? project(wx + half, yt, wz) : project(wx, yt, wz + half);
        const p4 = alongX ? project(wx - half, yt, wz) : project(wx, yt, wz - half);
        if (!p1 || !p2 || !p3 || !p4) continue;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fillStyle = lit
          ? (mood === 'night' ? 'rgba(255,206,140,.92)' : 'rgba(255,196,120,.78)')
          : 'rgba(126,176,204,.55)';
        ctx.fill();
      }
    }
  }

  /* A pulsing marker on the focused wing so clicking a tab is obviously
     connected to a part of the building. */
  let pulse = 0;
  function drawFocusMarker() {
    const b = BLOCKS.find(k => k.room === focusRoom) || BLOCKS[1];
    const p = project(b.x, b.h + 2.2, b.z);
    if (!p) return;
    const r = 5 + Math.sin(pulse) * 2.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(216,179,106,.9)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(216,179,106,.35)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // stem
    const foot = project(b.x, b.h, b.z);
    if (foot) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + r);
      ctx.lineTo(foot.x, foot.y);
      ctx.strokeStyle = 'rgba(216,179,106,.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawLabel() {
    ctx.font = '700 9px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    const placed = [];
    for (const b of BLOCKS) {
      if (!b.label) continue;
      const p = project(b.x, b.h + 1.4, b.z);
      if (!p) continue;
      const txt = b.label.toUpperCase();
      const wid = ctx.measureText(txt).width;
      // skip a label that would sit on top of one already drawn
      if (placed.some(q => Math.abs(q.x - p.x) < (q.w + wid) / 2 + 6 &&
                           Math.abs(q.y - p.y) < 12)) continue;
      placed.push({ x: p.x, y: p.y, w: wid });
      ctx.fillStyle = 'rgba(7,20,32,.62)';
      ctx.beginPath();
      const r = 3, w2 = wid / 2 + 5, h2 = 7;
      ctx.roundRect ? ctx.roundRect(p.x - w2, p.y - h2, w2 * 2, h2 * 2, r)
                    : ctx.rect(p.x - w2, p.y - h2, w2 * 2, h2 * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(240,215,158,.95)';
      ctx.fillText(txt, p.x, p.y + 3);
    }
  }

  /* ------------------------------------------------------------------ *
   * Frame
   * ------------------------------------------------------------------ */
  let ctx = null;

  function frame() {
    raf = requestAnimationFrame(frame);

    if (cam.goalYaw !== null) {
      cam.yaw += (cam.goalYaw - cam.yaw) * 0.08;
      cam.pitch += (cam.goalPitch - cam.pitch) * 0.08;
      cam.dist += (cam.goalDist - cam.dist) * 0.08;
      cam.tx += (cam.goalTx - cam.tx) * 0.08;
      cam.ty += (cam.goalTy - cam.ty) * 0.08;
      cam.tz += (cam.goalTz - cam.tz) * 0.08;
      if (Math.abs(cam.goalYaw - cam.yaw) < 0.002 &&
          Math.abs(cam.goalDist - cam.dist) < 0.2) {
        cam.goalYaw = cam.goalPitch = cam.goalDist = null;
        cam.goalTx = cam.goalTy = cam.goalTz = null;
      }
    } else if (autoRotate && !dragging) {
      cam.yaw += 0.0035;
    }

    pulse += 0.05;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGround();

    const faces = [];
    for (const b of BLOCKS) faces.push(...boxFaces(b));

    // include the courtyard before the blocks so it never covers them
    drawCourtyard();
    drawFaces(faces);
    drawWindows(faces);
    drawLabel();
    drawFocusMarker();

    if (!ready) {
      ready = true;
      const wrap = canvas.closest('.campus-scene');
      if (wrap) wrap.classList.add('ready');
      const st = $('campus-loading');
      if (st) {
        const t = st.querySelector && st.querySelector('.cl-text');
        if (t) t.textContent = 'Campus model · Canvas preview (no WebGL needed)';
        else st.textContent = 'Campus model · Canvas preview';
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Sizing
   * ------------------------------------------------------------------ */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (!ctx) ctx = canvas.getContext('2d');
  }

  /* ------------------------------------------------------------------ *
   * Interaction: drag to orbit, wheel to zoom
   * ------------------------------------------------------------------ */
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0;
    lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    cam.yaw -= dx * 0.006;
    cam.pitch = Math.max(0.16, Math.min(1.15, cam.pitch + dy * 0.004));
    cam.goalYaw = null;
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  canvas.addEventListener('mousedown', (e) => e.preventDefault());
  window.addEventListener('resize', resize);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.dist = Math.max(55, Math.min(240, cam.dist + e.deltaY * 0.12));
    cam.goalDist = null;
  }, { passive: false });

  /* ------------------------------------------------------------------ *
   * Controls wired to the same DOM the WebGL build uses
   * ------------------------------------------------------------------ */
  function goHome() {
    const h = homeForViewport();
    cam.goalYaw = h.yaw; cam.goalPitch = h.pitch; cam.goalDist = h.dist;
    cam.goalTx = h.tx; cam.goalTy = h.ty; cam.goalTz = h.tz;
  }

  function setMood(m) {
    mood = m;
    document.querySelectorAll('[data-time]').forEach(b =>
      b.classList.toggle('active', b.dataset.time === m));
  }

  function updateModeBadge() {
    const el = $('campus-mode');
    if (!el) return;
    if (tourTimer) return;               // the tour owns this label while running
    const time = mood === 'dusk' ? 'Golden hour' : mood === 'night' ? 'Evening' : 'Daylight';
    el.textContent = (cutaway ? 'Cutaway · plan view' : 'Exterior · roof on') + ` · ${time}`;
  }

  function focusRoomTo(id, keepBadge) {
    focusRoom = id;
    cutaway = true;
    if (!keepBadge) updateModeBadge();
    const roofBtn = $('roof-toggle');
    if (roofBtn) roofBtn.textContent = 'Show roof / exterior';

    const b = BLOCKS.find(k => k.room === id) || BLOCKS[1];
    // put the camera in front of that wing, looking in from outside
    const ang = Math.atan2(b.z - COURT.z, b.x - COURT.x);
    cam.goalYaw = -0.62 + (id === 'hub' ? 0 : (b.x < 0 ? 0.55 : -0.55));
    cam.goalPitch = 0.62;
    cam.goalDist = 70;
    cam.goalTx = b.x * 0.85;
    cam.goalTy = 2.2;
    cam.goalTz = b.z * 0.85;

    const t = $('room-title'), d = $('room-desc');
    if (t) t.textContent = ROOM_LABEL[id] || ROOM_LABEL.hub;
    if (d) d.textContent = DESCRIPTIONS[id] || DESCRIPTIONS.hub;
    document.querySelectorAll('.pill-tabs button').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.room === id));
  }

  const DESCRIPTIONS = {
    hub: 'A double-height entrance atrium with reception, a mezzanine, a digital feature wall and a skylight lantern above. Every programme area is reached from here, so the building works as one institution rather than a set of studios.',
    music: 'Three linked spaces: a control room with console and outboard rack, a live room with piano and drum kit, and an acoustically isolated vocal booth. The highest-fit-out cost line in the budget, and the first to open.',
    media: 'A true black-box stage with a curved cyc wall, lighting grid, dolly track and camera position, plus edit bays and a green room. Built with a double-height volume and blackout capability.',
    photo: 'A daylight-and-strobe studio with a seamless cove backdrop, overhead frame and scrim, softboxes on stands, prop store and a framed print wall for portfolio and exhibition work.',
    learn: 'Two teaching rooms either side of a shared foyer: a 9-station digital training room with a projection wall, and a seminar room for mentorship, business skills and partner sessions.',
    enterprise: 'Open co-working desks plus two glass-walled start-up rooms for incubated creative businesses — the step between training and independent, revenue-earning work.'
  };

  document.querySelectorAll('[data-room]').forEach(btn =>
    btn.addEventListener('click', () => {
      stopTour();
      focusRoomTo(btn.dataset.room);
      updateModeBadge();
    }));

  document.querySelectorAll('[data-time]').forEach(btn =>
    btn.addEventListener('click', () => setMood(btn.dataset.time)));

  const roofBtn = $('roof-toggle');
  if (roofBtn) roofBtn.addEventListener('click', () => {
    cutaway = !cutaway;
    roofBtn.textContent = cutaway ? 'Show roof / exterior' : 'Show floor plan (cutaway)';
    updateModeBadge();
  });

  const autoBtn = $('auto-toggle');
  if (autoBtn) autoBtn.addEventListener('click', () => {
    autoRotate = !autoRotate;
    autoBtn.textContent = 'Auto-orbit: ' + (autoRotate ? 'On' : 'Off');
    autoBtn.setAttribute('aria-pressed', String(autoRotate));
  });

  const resetBtn = $('reset-campus');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    stopTour();
    goHome();
    cutaway = false;
    if (roofBtn) roofBtn.textContent = 'Show floor plan (cutaway)';
    document.querySelectorAll('.pill-tabs button').forEach(b =>
      b.classList.remove('active'));
    updateModeBadge();
  });

  const insideBtn = $('inside-toggle');
  if (insideBtn) insideBtn.addEventListener('click', () => focusRoomTo('music'));

  /* The guided tour works here too, so the button is not dead. */
  const TOUR = ['hub', 'music', 'media', 'photo', 'learn', 'enterprise'];
  const TOUR_COPY = DESCRIPTIONS;
  let tourIdx = 0, tourTimer = null;
  const tourBtn = $('tourBtn');

  function stopTour() {
    if (tourTimer) { clearInterval(tourTimer); tourTimer = null; }
    if (tourBtn) tourBtn.textContent = '▶ Start the guided 3D tour';
  }
  function tourStep() {
    const id = TOUR[tourIdx % TOUR.length];
    focusRoomTo(id, true);
    if (tourBtn) tourBtn.textContent = `Guided tour ${(tourIdx % TOUR.length) + 1}/${TOUR.length} · ${ROOM_LABEL[id]}`;
    const mode = $('campus-mode');
    if (mode) mode.textContent = `Guided tour ${(tourIdx % TOUR.length) + 1}/${TOUR.length} · ${ROOM_LABEL[id]}`;
    tourIdx++;
  }
  if (tourBtn) tourBtn.addEventListener('click', () => {
    if (tourTimer) { stopTour(); return; }
    tourIdx = 0;
    tourStep();
    tourTimer = setInterval(tourStep, 4200);
  });
  canvas.addEventListener('pointerdown', () => stopTour());

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  resize();
  {
    const h = homeForViewport();
    cam.dist = h.dist;
  }
  updateModeBadge();
  const t0 = $('room-title'), d0 = $('room-desc');
  if (t0) t0.textContent = ROOM_LABEL.hub;
  if (d0) d0.textContent = DESCRIPTIONS.hub;

  // Expose so the WebGL module can tell this one to stand down.
  window.ucicCanvasCampus = { stop() { if (raf) cancelAnimationFrame(raf); raf = null; } };

  frame();
})();
