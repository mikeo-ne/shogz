/* UCIC — document interactions.
 *
 * The proposal is a static document first. Everything here is progressive
 * enhancement: if this file fails to load or JS is disabled, every figure,
 * table row and budget line is still rendered by the PDF build and by the
 * server-rendered markup. Nothing on this page *requires* JavaScript to be
 * read.
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------------
   * Budget model — the single source of truth.
   *
   * This array is mirrored in tools/build_pdf.py for the PDF edition.
   * They must stay identical; tools/check_sync.py asserts that they do.
   * --------------------------------------------------------------- */
  var BUDGET = [
    ['Feasibility, legal, architectural & engineering', 150,
      'Studies, legal structuring, concept design and technical assessments.'],
    ['Property deposit, lease preparation & initial occupancy', 120,
      'Initial occupancy costs for a serviced plot; final amount depends on the property route.'],
    ['Container supply, siting & site infrastructure', 500,
      'Container modules, delivery and craning, foundations, decking and essential site infrastructure.'],
    ['Acoustic engineering & treatment', 300,
      'Sound isolation, room acoustics and treatment for professional music spaces.'],
    ['Music production equipment', 350,
      'Priority recording, production, mixing and mastering equipment.'],
    ['Film, photography & digital media equipment', 300,
      'Cameras, lighting, editing and related production equipment for phased services.'],
    ['Computers, software, networking & storage', 180,
      'Workstations, licensed tools, network infrastructure and secure storage.'],
    ['Electrical systems & backup power', 220,
      'Electrical upgrades, distribution, protection and backup power.'],
    ['Furniture & shared facilities', 150,
      'Learning, collaboration, reception, office and shared-use furniture.'],
    ['Safety, security & accessibility', 80,
      'Fire and life safety, access control, security and accessibility improvements.'],
    ['Recruitment & staff training', 70,
      'Core team mobilisation, onboarding and operational training.'],
    ['Launch & outreach', 30,
      'Public information, launch activities and beneficiary outreach.'],
    ['Initial operating reserve', 350,
      'Initial working-capital buffer; not a multi-year operating commitment.'],
    ['Contingency', 200,
      'Preliminary provision for unforeseen establishment costs.']
  ];

  var TOTAL = BUDGET.reduce(function (s, b) { return s + b[1]; }, 0);

  function ugx(n) { return 'UGX ' + n.toLocaleString('en-US') + 'm'; }
  function pct(n) { return (n / TOTAL * 100).toFixed(1) + '%'; }

  /* ---------------------------------------------------------------
   * Budget tables
   * --------------------------------------------------------------- */
  function renderRows(tbody) {
    if (!tbody) return;
    var max = Math.max.apply(null, BUDGET.map(function (b) { return b[1]; }));
    tbody.innerHTML = BUDGET.map(function (b, i) {
      var n = String(i + 1).padStart(2, '0');
      return '<tr>' +
        '<td>' + n + '</td>' +
        '<th scope="row">' + b[0] + '</th>' +
        '<td>' + b[2] + '</td>' +
        '<td class="num">' + ugx(b[1]) + '</td>' +
        '<td class="num">' + pct(b[1]) + '</td>' +
        '</tr>';
    }).join('');
  }
  renderRows(document.getElementById('budgetBody'));
  renderRows(document.getElementById('annexBody'));

  /* ---------------------------------------------------------------
   * Bar chart
   * --------------------------------------------------------------- */
  var chart = document.getElementById('budgetChart');
  if (chart) {
    var maxV = Math.max.apply(null, BUDGET.map(function (b) { return b[1]; }));
    chart.innerHTML = BUDGET.map(function (b) {
      var w = (b[1] / maxV * 100).toFixed(2);
      var short = b[0]
        .replace('Feasibility, legal, architectural & engineering', 'Feasibility & legal')
        .replace('Property deposit, lease preparation & initial occupancy', 'Property & occupancy')
        .replace('Container supply, siting & site infrastructure', 'Containers & infrastructure')
        .replace('Acoustic engineering & treatment', 'Acoustics & treatment')
        .replace('Music production equipment', 'Music equipment')
        .replace('Film, photography & digital media equipment', 'Film & photo equipment')
        .replace('Computers, software, networking & storage', 'Computers & software')
        .replace('Electrical systems & backup power', 'Electrical & backup power')
        .replace('Furniture & shared facilities', 'Furniture & facilities')
        .replace('Safety, security & accessibility', 'Safety & accessibility')
        .replace('Recruitment & staff training', 'Recruitment & training')
        .replace('Launch & outreach', 'Launch & outreach')
        .replace('Initial operating reserve', 'Operating reserve')
        .replace('Contingency', 'Contingency');
      return '<div class="bar-row">' +
        '<span class="bar-name">' + short + '</span>' +
        '<span class="bar-val">' + ugx(b[1]) + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + w + '%"></span></span>' +
        '</div>';
    }).join('');
  }

  /* ---------------------------------------------------------------
   * Navigation
   * --------------------------------------------------------------- */
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------------------------------------------------------
   * Reveal on scroll
   * --------------------------------------------------------------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('.doc-head, .figure, .panel, .room, .callout, .data-table, .letter, .summary-card');
  if (!('IntersectionObserver' in window) || reduce) {
    targets.forEach(function (el) { el.classList.add('reveal', 'in'); });
  } else {
    targets.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------
   * Download fallback
   *
   * The PDF is a committed file next to index.html, so the links work
   * without JavaScript. If it is missing (for instance a partial deploy),
   * say so plainly rather than silently doing nothing.
   * --------------------------------------------------------------- */
  document.querySelectorAll('a[download$=".pdf"]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (!a.getAttribute('href')) {
        var t = document.getElementById('toast');
        if (t) { t.textContent = 'The PDF edition is not available right now.'; t.classList.add('show'); }
      }
    });
  });
})();
