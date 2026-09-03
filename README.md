# SHOGZZ — Editorial Photography Portfolio

A clean, responsive, high-end editorial photography portfolio website built with
semantic HTML, modern CSS, and vanilla JavaScript. No framework, no build step —
just open `index.html` or serve the folder.

Built for **SHOGZZ** (ShoghiMbaya) — entrepreneur & creator. Visual diary spanning
architecture, food & drinks, and travel & lifestyle.

## Design system

| Role                  | Value     |
| --------------------- | --------- |
| Background / linen    | `#FDFBF7` |
| Body / headings       | `#2A221E` |
| Metadata / sand-taupe | `#8C7C6D` |

- **Headings:** Playfair Display (primary serif) + Cormorant Garamond (italic serif)
- **UI / labels:** Space Grotesk (fallback Inter)

## Features

- **Sticky header** — "SHOGZZ" brand + navigation (Architecture, Food & Drinks,
  Travel, Contact). Inverts from light (over the hero) to dark on scroll.
  Full-screen slide-down menu on mobile.
- **Hero** — large editorial "REDEFINE CREATIVITY" typography with an italic tagline
  over a slow-zooming architectural backdrop.
- **Three portfolio sections** — Architectural Photography, Food & Drinks,
  Travel & Lifestyle — each a 3-column (→ 2 → 1 on smaller screens) responsive grid.
- **Cards** — image + project title + metadata tag (e.g. `2026 • KAMPALA`), subtle
  hover zoom, and an index numeral.
- **Lightbox** — click a card to open a full-screen modal with a close button,
  prev/next navigation, keyboard support (`Esc`, `←`, `→`), and backdrop-click to close.
- **Footer** — centered "Let's Collaborate" call-to-action, a connect button linking to
  [SHOGZZ's Linktree](https://linktr.ee/ShoghiMbaya), social links (YouTube, X/Twitter,
  Snapchat), and copyright.

## Structure

```
index.html          # Page markup
css/style.css       # Design system + layout + responsive rules
js/main.js          # Grid render, lightbox, smooth scroll, header state, reveals
images/             # Photographic assets + favicon
```

## Run locally

```bash
# any static server works, e.g.
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploy

The included GitHub Actions workflow (`static.yml`) publishes the repository
contents to GitHub Pages on pushes to `main`.
