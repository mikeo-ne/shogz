/* ==========================================================================
   SHOGZZ — Interactive portfolio behaviour
   ========================================================================== */
(() => {
  "use strict";

  /* ------------------------------------------------------------------
     Portfolio data
     Each image lives in /images. Grids are rendered from this single
     source of truth so the caption + lightbox stay in sync.
  ------------------------------------------------------------------ */
  const PORTFOLIO = {
    architecture: [
      { title: "Meridian House",   meta: "2026 • KAMPALA",       src: "images/architecture-01.jpg" },
      { title: "The Spiral Stair", meta: "2025 • ADDIS ABABA",   src: "images/architecture-02.jpg" },
      { title: "Concrete Verse",   meta: "2024 • DAR ES SALAAM", src: "images/architecture-03.jpg" }
    ],
    food: [
      { title: "Morning Ritual",   meta: "2026 • KIGALI",        src: "images/food-01.jpg" },
      { title: "Plated in Season", meta: "2025 • NAIROBI",       src: "images/food-02.jpg" },
      { title: "Slow Afternoon",   meta: "2024 • ZANZIBAR",      src: "images/food-03.jpg" }
    ],
    travel: [
      { title: "Savanna Light",    meta: "2026 • SERENGETI",     src: "images/travel-01.jpg" },
      { title: "City Reverie",     meta: "2025 • LAGOS",         src: "images/travel-02.jpg" },
      { title: "The Quiet Coast",  meta: "2024 • MOMBASA",       src: "images/travel-03.jpg" }
    ]
  };

  const gridMap = {
    architecture: document.getElementById("grid-architecture"),
    food: document.getElementById("grid-food"),
    travel: document.getElementById("grid-travel")
  };

  /* Ordered list of every image, used for lightbox prev/next navigation */
  const allItems = [];
  let currentLightboxIndex = -1;

  /* ------------------------------------------------------------------
     Render cards
  ------------------------------------------------------------------ */
  function renderGrid(sectionKey, gridEl) {
    if (!gridEl) return;
    const items = PORTFOLIO[sectionKey];

    const html = items
      .map((item, i) => {
        const globalIndex = allItems.length + i;
        return `
          <button class="card reveal" type="button"
                  data-index="${globalIndex}"
                  aria-label="View ${item.title}, ${item.meta}"
                  aria-haspopup="dialog">
            <span class="card-media">
              <img src="${item.src}" alt="${item.title}" loading="lazy" />
              <span class="card-index">${String(i + 1).padStart(2, "0")}</span>
            </span>
            <span class="card-caption">
              <span class="card-title">${item.title}</span>
              <span class="card-meta">${item.meta}</span>
            </span>
          </button>`;
      })
      .join("");

    gridEl.innerHTML = html;
    items.forEach((item) => allItems.push(item));
  }

  ["architecture", "food", "travel"].forEach((key) => renderGrid(key, gridMap[key]));

  /* ------------------------------------------------------------------
     Smooth scroll for in-page links
  ------------------------------------------------------------------ */
  document.querySelectorAll("[data-scroll]").forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      const offset = 70;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: "smooth" });
      closeMobileNav();
    });
  });

  /* ------------------------------------------------------------------
     Sticky header state
  ------------------------------------------------------------------ */
  const header = document.getElementById("siteHeader");
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     Mobile nav
  ------------------------------------------------------------------ */
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");

  function closeMobileNav() {
    mainNav.classList.remove("is-open");
    header.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("is-open");
    header.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMobileNav();
  });

  /* ------------------------------------------------------------------
     Reveal-on-scroll (IntersectionObserver)
  ------------------------------------------------------------------ */
  const revealEls = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => io.observe(el));

  /* ------------------------------------------------------------------
     Lightbox
  ------------------------------------------------------------------ */
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxTitle = document.getElementById("lightboxTitle");
  const lightboxMeta = document.getElementById("lightboxMeta");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");

  function openLightbox(index) {
    if (index < 0 || index >= allItems.length) return;
    const item = allItems[index];
    currentLightboxIndex = index;
    lightboxImage.src = item.src;
    lightboxImage.alt = item.title;
    lightboxTitle.textContent = item.title;
    lightboxMeta.textContent = item.meta;

    lightboxPrev.hidden = index === 0;
    lightboxNext.hidden = index === allItems.length - 1;

    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    currentLightboxIndex = -1;
  }

  function stepLightbox(dir) {
    if (currentLightboxIndex < 0) return;
    openLightbox(currentLightboxIndex + dir);
  }

  ["architecture", "food", "travel"].forEach((key) => {
    const grid = gridMap[key];
    if (!grid) return;
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (card) openLightbox(Number(card.dataset.index));
    });
    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".card");
      if (!card) return;
      e.preventDefault();
      openLightbox(Number(card.dataset.index));
    });
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", () => stepLightbox(-1));
  lightboxNext.addEventListener("click", () => stepLightbox(1));

  /* Click on the backdrop closes the lightbox */
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });

  /* ------------------------------------------------------------------
     Footer year
  ------------------------------------------------------------------ */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
