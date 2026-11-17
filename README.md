# Uganda Creative Innovation Centre (UCIC) — Ministerial Proposal

A proposal to establish the **Uganda Creative Innovation Centre**, a public music and creative
production facility in Kampala. It is **music-first**: recording, production and mixing rooms open
in Phase 1, with film, photography, creative technology and enterprise following.

> *Record. Produce. Learn. Earn.*

Submitted for the consideration of **Hon. Lt. Gen. (Rtd) Henry Tumukunde**, Minister of Gender,
Labour and Social Development.

## Two editions, one document

The proposal exists in two forms, and they carry the **same content and the same design**:

| Edition | File | Purpose |
|---|---|---|
| Interactive | `index.html` | To be read on screen |
| Print / PDF | `UCIC-proposal.pdf` | The copy to circulate, print or attach to a submission |

The PDF is not a summary. It is the whole document — letter of transmittal, all eight sections and
the annexes — laid out for A4. `tools/check_parity.py` asserts that the two editions still agree, so
they cannot drift apart.

## Structure

| # | Section | Contents |
|---|---------|----------|
| — | Cover | Title, addressee, subject, date, provenance |
| — | Transmittal | Formal letter to the Minister |
| — | Contents | Document map |
| — | Executive summary | What is proposed, what it costs, headline figures |
| 1 | Background and public case | Why production infrastructure is the constraint |
| 2 | Fit with the Ministry's mandate | YLP, UWEP, GROW and SAGE, and the gap UCIC fills |
| 3 | The proposed facility | Four 40ft containers around a courtyard, four music spaces, site strategy |
| 4 | Programmes and access model | Five programme areas, three access tiers |
| 5 | Indicative investment framework | UGX 3.0bn, 14 budget lines, funding sequence |
| 6 | Governance, audit and public value | Safeguards and the measures that will be reported |
| 7 | Delivery roadmap | Validate → Establish → Launch music-first → Expand |
| 8 | Decisions requested | Six requests and the 90-day development phase |
| — | Annexes | Assumptions, budget schedule, definitions |

## Images

Four illustrative concepts live in `images/`, all of the modular container scheme:

| File | Shows |
|---|---|
| `compound-exterior.jpg` | The four-container cluster around the covered courtyard deck (cover + Section 3) |
| `studio-container.jpg` | Studio container interior: vocal booth behind a glazed acoustic window, control room |
| `beatlab-container.jpg` | Beat lab container interior, opening onto the courtyard deck |

**They are renderings, not approved designs and not photographs of any site** — every placement is
captioned as such, in both editions.

### On the area figures

Four 40ft high-cube containers give roughly **120 m²** of enclosed floor plus the covered deck. The
**1,000–1,200 m²** figure is the **full campus at completion**, not the first cluster. Both figures are
deliberate and both editions explain the difference in Section 3 — do not quietly swap one for the other.

## Build

No build step for the website: plain HTML, CSS and JavaScript, deployable to any static host.

Fonts are self-hosted in `fonts/` (Fraunces, Inter — both SIL OFL), so the site has no external
font dependency. The browser uses the `.woff2` files; the PDF builder uses the `.ttf` files.

To regenerate the PDF after editing content:

```bash
python3 -m pip install reportlab pymupdf
python3 tools/build_pdf.py        # writes UCIC-proposal.pdf
python3 tools/check_parity.py     # asserts web and PDF editions agree
```

`tools/build_pdf.py` lays the document out directly with reportlab. A headless-browser
"print to PDF" was tried first and could not run in this environment (no browser binary and no
system libraries available), so the PDF is composed rather than screenshotted — which also gives
real page numbers, running footers and selectable text.

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy

The `shogz` project on Vercel is linked to `mikeo-ne/shogz`. Merge to `main` and Vercel rebuilds
automatically; no build command or framework preset is needed. The PDF is a committed file, so it
serves as a normal download at `/UCIC-proposal.pdf`.

## Editorial rules for the two editions

If you edit content, edit it in **both** places:

- **Budget lines** — `BUDGET` in `js/main.js` *and* `BUDGET` in `tools/build_pdf.py`.
  `check_parity.py` fails if they differ.
- **Figures** — UGX 3.0bn total, UGX 650m music allocation, 1,000–1,200 m², 24 months. These appear
  in the cover, summary, Section 5 and the annexes.
- **Tone** — this is a submission to a serving Cabinet Minister. No marketing superlatives, no
  claims of approval, no unqualified cost certainty. Wherever a figure is an estimate, say so.

## Status

Version 1.0, November 2026. A proposal for consideration: not an approved government project, not a
procurement document, and not a commitment of public funds.
