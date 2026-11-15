/* UCIC — Main interactions: preloader, nav, reveals, pillars, budget, share */
(function () {
  'use strict';

  /* ---------- Preloader ---------- */
  const pre = document.getElementById('preloader');
  const preFill = document.getElementById('preBarFill');
  const prePct = document.getElementById('prePct');
  let p = 0;
  const preTimer = setInterval(() => {
    p = Math.min(100, p + Math.random() * 16 + 6);
    if (preFill) preFill.style.width = p + '%';
    if (prePct) prePct.textContent = Math.round(p) + '%';
    if (p >= 100) {
      clearInterval(preTimer);
      setTimeout(() => {
        pre.classList.add('done');
        heroIntro();
      }, 250);
    }
  }, 110);

  /* ---------- Hero intro (GSAP if available) ---------- */
  function heroIntro() {
    if (window.gsap) {
      gsap.to('.hero-title .line-inner', { y: 0, duration: 1.1, stagger: 0.12, ease: 'power4.out' });
      gsap.to('.reveal-hero', { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', delay: 0.3 });
    } else {
      document.querySelectorAll('.hero-title .line-inner').forEach(el => el.style.transform = 'none');
      document.querySelectorAll('.reveal-hero').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    }
    startCounters();
  }

  /* ---------- Nav ---------- */
  const topbar = document.getElementById('topbar');
  const progress = document.getElementById('scrollProgress');
  window.addEventListener('scroll', () => {
    topbar.classList.toggle('scrolled', window.scrollY > 40);
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  }, { passive: true });

  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  navToggle.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
  });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---------- Counters ---------- */
  /* The figures are already correct in the markup, so print / PDF, slow JS
     and no-JS visitors always see real numbers rather than UGX 0bn. The
     animation only settles them, and never rewinds a correct value to zero.

     t0 comes from the first animation frame, not performance.now(): the two
     clocks do not share an origin in every browser, which rendered the stats
     as "-16.8bn" on a real deployment. Progress is clamped as well. */
  let countersStarted = false;
  function formatStat(el, value) {
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    return prefix + value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }) + suffix;
  }
  function startCounters() {
    if (countersStarted) return;
    countersStarted = true;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseFloat(el.dataset.count);
      if (!isFinite(target)) return;
      if (reduce) { el.textContent = formatStat(el, target); return; }
      const from = target * 0.7;
      const dur = 1100;
      let t0 = null;
      function tick(now) {
        if (t0 === null) t0 = now;
        const raw = (now - t0) / dur;
        const t = raw < 0 ? 0 : raw > 1 ? 1 : raw;
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = formatStat(el, from + (target - from) * eased);
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Marquee duplicate for seamless loop ---------- */
  const track = document.getElementById('marqueeTrack');
  if (track) track.innerHTML += track.innerHTML;

  /* ---------- Stagger children inside revealed groups ---------- */
  document.querySelectorAll('.grid, .pillars, .timeline').forEach(group => {
    [...group.children].forEach((child, i) => {
      child.style.transitionDelay = (i * 0.07) + 's';
    });
  });

  /* ---------- Tilt cards ---------- */
  document.querySelectorAll('.tilt').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  /* ---------- Pillars ---------- */
  const pillars = [
    ['Music & sound production', 'The first operational priority: accessible professional recording and production rooms, equipment orientation, producer development, artist coaching, collaborative sessions and practical pathways into paid work.', ['Recording', 'Production', 'Mixing & mastering', 'Artist development']],
    ['Film & digital media', 'A phased set of facilities and training for video production, editing, sound for picture, digital storytelling and commercial content creation.', ['Video production', 'Editing', 'Sound for picture', 'Storytelling']],
    ['Photography & visual arts', 'Shared photography facilities, lighting, visual communication, design practice, portfolio development and exhibition opportunities.', ['Photography', 'Lighting', 'Design', 'Exhibition']],
    ['Creative technology & innovation', 'A collaborative environment for creative software, music intelligence, intellectual property awareness, data tools, product testing and Ugandan technology innovators.', ['Music intelligence', 'IP awareness', 'Data tools', 'Incubation']],
    ['Learning, performance & enterprise', 'Practical training, mentorship, performance opportunities, business skills, market readiness, partnerships and pathways to sustainable creative enterprise.', ['Training', 'Mentorship', 'Performance', 'Enterprise']]
  ];
  const pillarEls = document.querySelectorAll('.pillar');
  function setPillar(i) {
    pillarEls.forEach(x => x.classList.toggle('active', +x.dataset.pillar === i));
    const [title, desc, tags] = pillars[i];
    const tEl = document.getElementById('pillar-title');
    const dEl = document.getElementById('pillar-desc');
    const nEl = document.getElementById('pillar-num');
    const tagsEl = document.getElementById('pillar-tags');
    if (window.gsap) {
      gsap.fromTo([tEl, dEl], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out' });
    }
    tEl.textContent = title; dEl.textContent = desc;
    nEl.textContent = String(i + 1).padStart(2, '0');
    tagsEl.innerHTML = tags.map(t => `<span>${t}</span>`).join('');
  }
  pillarEls.forEach(el => {
    el.addEventListener('click', () => setPillar(+el.dataset.pillar));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPillar(+el.dataset.pillar); } });
  });
  setPillar(0);

  /* ---------- Budget ---------- */
  const budget = [
    ['Feasibility, legal, architectural & engineering', 150, 'Studies, legal structuring, concept design and technical assessments.', '#D8B36A'],
    ['Property deposit, lease preparation & initial occupancy', 120, 'Initial occupancy costs for an existing premises; final amount depends on the selected property route.', '#BB9150'],
    ['Building renovation & infrastructure', 500, 'Building adaptation, internal works, circulation, finishes and essential infrastructure.', '#466B86'],
    ['Acoustic engineering & treatment', 300, 'Sound isolation, room acoustics and treatment for professional music spaces.', '#9A7B56'],
    ['Music production equipment', 350, 'Priority recording, production, mixing and mastering equipment.', '#547E8D'],
    ['Film, photography & digital media equipment', 300, 'Cameras, lighting, editing and related production equipment for phased services.', '#7B9D9D'],
    ['Computers, software, networking & storage', 180, 'Workstations, licensed tools, network infrastructure and secure storage.', '#344D68'],
    ['Electrical systems & backup power', 220, 'Electrical upgrades, distribution, protection and backup power.', '#B7A58A'],
    ['Furniture & shared facilities', 150, 'Learning, collaboration, reception, office and shared-use furniture.', '#7F8B91'],
    ['Safety, security & accessibility', 80, 'Fire and life safety, access control, security and accessibility improvements.', '#52667A'],
    ['Recruitment & staff training', 70, 'Core team mobilisation, onboarding and operational training.', '#A78D61'],
    ['Launch & outreach', 30, 'Public information, launch activities and beneficiary outreach.', '#647F73'],
    ['Initial operating reserve', 350, 'Initial working-capital buffer; not a full multi-year operating commitment.', '#9A7447'],
    ['Contingency', 200, 'Preliminary provision for unforeseen establishment costs.', '#C9BDA9']
  ];
  const fmt = n => 'UGX ' + n.toLocaleString('en-US') + 'm';
  const total = budget.reduce((s, b) => s + b[1], 0); // 3000

  // Donut (SVG arcs)
  const donutG = document.getElementById('donutSegments');
  const R = 82, CX = 100, CY = 100;
  let angle = -Math.PI / 2;
  function polar(a, r) { return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; }
  function arcPath(a0, a1) {
    const [x0, y0] = polar(a0, R), [x1, y1] = polar(a1, R);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`;
  }
  budget.forEach((b, i) => {
    const frac = b[1] / total;
    const a0 = angle, a1 = angle + frac * Math.PI * 2 - 0.012;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', arcPath(a0, a1));
    path.setAttribute('stroke', b[3]);
    path.setAttribute('stroke-width', '26');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'butt');
    path.dataset.idx = i;
    donutG.appendChild(path);
    angle = a1 + 0.012;
  });

  const list = document.getElementById('budget-list');
  const detail = document.getElementById('budget-detail');
  const donutCenter = document.getElementById('donutCenter');
  const donutSub = document.getElementById('donutSub');
  const maxVal = Math.max(...budget.map(b => b[1]));

  function selectBudget(i) {
    const b = budget[i];
    document.querySelectorAll('.budget-row').forEach((r, j) => r.classList.toggle('active', j === i));
    document.querySelectorAll('#donutSegments path').forEach((p, j) => {
      p.style.opacity = j === i ? '1' : '0.35';
      p.style.transform = j === i ? 'scale(1.04)' : 'scale(1)';
    });
    detail.textContent = b[2] + ' Allocation: ' + fmt(b[1]) + ' (' + (b[1] / total * 100).toFixed(1) + '% of total).';
    donutCenter.textContent = fmt(b[1]).replace('UGX ', '');
    donutSub.textContent = b[0].split(',')[0];
    if (window.gsap) gsap.fromTo(detail, { opacity: 0.4 }, { opacity: 1, duration: 0.4 });
  }

  budget.forEach((b, i) => {
    const row = document.createElement('div');
    row.className = 'budget-row';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.innerHTML = `<div><div class="bname"><span class="swatch" style="background:${b[3]}"></span>${b[0]}<span class="pct">${(b[1] / total * 100).toFixed(1)}%</span></div><div class="bar"><i data-w="${b[1] / maxVal * 100}"></i></div></div><strong>${fmt(b[1])}</strong>`;
    row.addEventListener('click', () => selectBudget(i));
    row.addEventListener('keydown', e => { if (e.key === 'Enter') selectBudget(i); });
    list.appendChild(row);
  });
  donutG.querySelectorAll('path').forEach(p => p.addEventListener('click', () => selectBudget(+p.dataset.idx)));

  // Animate bars when visible
  const barIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.bar i').forEach(bar => bar.style.width = bar.dataset.w + '%');
        barIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  barIO.observe(list);

  /* ---------- Toast ---------- */
  const toast = document.getElementById('toast');
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  /* ---------- Share ---------- */
  async function shareProposal() {
    const data = {
      title: 'Uganda Creative Innovation Centre — Ministerial Proposal',
      text: 'Where Uganda’s creative future takes shape. Explore the interactive 3D UCIC proposal: campus, UGX 3.0bn investment & roadmap.',
      url: location.href
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch (e) { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(location.href);
        showToast('Proposal link copied to clipboard ✓');
      } catch (e) {
        showToast('Copy this link to share: ' + location.href);
      }
    }
  }
  ['shareBtn', 'shareBtn2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', shareProposal);
  });

  /* ---------- Print ---------- */
  ['printBtn', 'printBtn2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => window.print());
  });

  /* ---------- Download budget summary ---------- */
  const dl = document.getElementById('downloadBudget');
  if (dl) dl.addEventListener('click', () => {
    const lines = [
      'UGANDA CREATIVE INNOVATION CENTRE — BUDGET SUMMARY',
      'Total indicative establishment investment: UGX 3.0bn (preliminary planning estimate)',
      'Note: Assumes existing suitable building. Excludes land purchase, new construction & multi-year operating budget.',
      '',
      ...budget.map(b => `• ${b[0]} — ${fmt(b[1])} (${(b[1] / total * 100).toFixed(1)}%)`),
      '',
      'All values indicative — subject to feasibility, bill of quantities & supplier quotations.'
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'UCIC-budget-summary.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Budget summary downloaded ✓');
  });

  /* ---------- GSAP ScrollTrigger reveals (enhance) ---------- */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('.reveal').forEach(el => {
      gsap.fromTo(el, { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.85, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
    // Parallax on hero canvas
    gsap.to('#hero3d', {
      yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }
})();
