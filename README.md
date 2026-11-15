# Uganda Creative Innovation Centre (UCIC) — Interactive 3D Ministerial Proposal

A modern, shareable, interactive 3D proposal website for the **Uganda Creative Innovation Centre** — a national creative development institution in Kampala, Uganda.

> *Where Uganda's creative future takes shape.*

Prepared for consideration by **Hon. Lt. Gen. (Rtd) Henry Tumukunde**, Minister of Gender, Labour and Social Development.

## What this is

A single-page interactive proposal that replaces a static document with a living experience:

- **Animated 3D hero** — particle field + wireframe campus massing (Three.js)
- **Interactive 3D campus** — orbit, zoom, click buildings, cutaway interiors, "enter the music studio", auto-orbit
- **Animated investment framework** — interactive SVG donut chart + clickable UGX 3.0bn budget lines with downloadable summary
- **Five institutional pillars** — interactive explorer
- **Delivery roadmap, governance, East Sound Technologies** showcase
- **Ministerial request** section with share + print/PDF actions
- Scroll animations (GSAP ScrollTrigger), counters, tilt cards, marquee, preloader, progress bar

## Content sections

| # | Section | Highlights |
|---|---------|------------|
| 01 | The national case | Talent · Access · Enterprise, vision & mission |
| 02 | Campus 3D | 6-wing concept campus, ~1,000–1,200 m² |
| 03 | Pillars | Music, film, photography, creative tech, learning & enterprise |
| 04 | Investment | UGX 3.0bn preliminary establishment plan (14 lines) |
| 05 | East Sound | Homegrown music-intelligence initiative |
| 06 | Roadmap | Validate → Establish → Launch → Expand (24 months) |
| 07 | Governance | Safeguards & impact metrics |
| 08 | Ministerial request | 90-day development phase ask |

## Tech

- **No build step** — plain HTML/CSS/JS, deploy anywhere static
- Three.js (r161 via CDN import map) for both 3D scenes
- GSAP 3 + ScrollTrigger via CDN for scroll animation
- Google Fonts: Fraunces (serif display) + Inter + Space Grotesk

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

> Note: ES modules + import maps require serving over HTTP (not `file://`).

## Deploy / share

- **Vercel** — the `shogz` project is already linked to `mikeo-ne/shogz`. Merge to `main`
  and Vercel rebuilds automatically; no build command or framework preset is needed.
  Live: <https://shogz.vercel.app>
- **GitHub Pages** — `.github/workflows/static.yml` also publishes on push to `main`.
- **Netlify** — import the repo, leave the build command empty, publish directory `/`.
- **Share** — use the in-page *Share proposal* button (Web Share API → clipboard fallback),
  or copy the live URL. `images/og-cover.png` (1200×630) provides rich link previews on
  WhatsApp, X, LinkedIn and Slack.

## Notes

- `.nojekyll` is included so GitHub Pages serves the `js/` folder byte-for-byte.
- The preloader has a 5-second failsafe and inline `<noscript>` styles, so content is never
  trapped behind an animation if a CDN is blocked.
- `prefers-reduced-motion` disables auto-orbit, marquee motion and reveal animations.

## Structure

```
index.html          # Page markup (all proposal content)
css/style.css       # Design system + layout + responsive + print
js/main.js          # Preloader, nav, reveals, pillars, budget, share
js/campus.js        # Three.js interactive campus model
js/hero3d.js        # Three.js hero particle/massing background
images/             # Favicon, OG cover (svg + png)
```

## Disclaimer

All visuals are conceptual. Budget and facility specifications are preliminary and subject to feasibility, design, procurement and approvals. © 2026 · Draft for discussion.
