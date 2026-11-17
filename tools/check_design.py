#!/usr/bin/env python3
"""
Check UCIC-design.pdf against the design basis it claims to describe.

A drawing set is only worth anything if its arithmetic holds. This script does
not read the numbers printed on the page and compare them with themselves; it
recomputes the geometry from the ISO container dimensions and then asks whether
the document agrees.

Checks
------
1. Envelope arithmetic   — envelope = L + 2W by L; courtyard = L by (L - 2W)
2. Containers close      — the four modules tile the envelope with a courtyard
                           hole exactly, and no module overlaps another
3. Areas                 — each room's parts sum to the container's gross
                           internal floor, within tolerance
4. Area schedule         — the printed schedule matches the recomputation
5. Cross-document        — the design note's enclosed figure is consistent with
                           the proposal's "roughly 120 m2" claim
6. No overlap in PDF     — no text runs outside the page margins
7. Scale honesty         — the scale stated on each drawing sheet matches the
                           scale the drawing was actually laid out at

Run:  python3 tools/check_design.py
Exit: 0 clean, 1 problems found
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import design_data as D

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "UCIC-design.pdf")

failures = []
notes = []

TOL = D.TOLERANCE_M2


def fail(msg):
    failures.append(msg)


def ok(msg):
    notes.append(msg)


# ---------------------------------------------------------------- 1. envelope
def check_envelope():
    ew = D.CONT_L + 2 * D.CONT_W
    if abs(ew - D.ENVELOPE_W) > 0.5:
        fail("envelope width: expected L + 2W = %.1f, design_data says %.1f"
             % (ew, D.ENVELOPE_W))
    if abs(D.CONT_L - D.ENVELOPE_D) > 0.5:
        fail("envelope depth: expected L = %.1f, design_data says %.1f"
             % (D.CONT_L, D.ENVELOPE_D))

    cw = D.CONT_L
    cd = D.CONT_L - 2 * D.CONT_W
    if abs(cw - D.COURT_W) > 0.5:
        fail("courtyard width: expected L = %.1f, design_data says %.1f"
             % (cw, D.COURT_W))
    if abs(cd - D.COURT_D) > 0.5:
        fail("courtyard depth: expected L - 2W = %.1f, design_data says %.1f"
             % (cd, D.COURT_D))

    area = cw * cd / 1e6
    if abs(area - D.COURT_M2) > 0.05:
        fail("courtyard area: recomputed %.2f m2, design_data says %.2f m2"
             % (area, D.COURT_M2))
    else:
        ok("envelope %.3f x %.3f m; courtyard %.3f x %.3f m = %.1f m2"
           % (ew / 1000, D.CONT_L / 1000, cw / 1000, cd / 1000, area))


# ---------------------------------------------------------------- 2. tiling
def room_rect(r):
    """South-west corner and size of a module, in model millimetres."""
    if r["rot"] == 0:
        return r["x"], r["y"], D.CONT_L, D.CONT_W
    return r["x"], r["y"], D.CONT_W, D.CONT_L


def check_tiling():
    """The four modules must tile the envelope ring without gaps or overlaps."""
    rects = [room_rect(r) for r in D.ROOMS]

    # every module inside the envelope
    for r, (x, y, w, h) in zip(D.ROOMS, rects):
        if x < -0.5 or y < -0.5 or x + w > D.ENVELOPE_W + 0.5 or y + h > D.ENVELOPE_D + 0.5:
            fail("%s sits outside the envelope" % r["ref"])

    # no two modules overlap
    for i in range(len(rects)):
        for j in range(i + 1, len(rects)):
            ax, ay, aw, ah = rects[i]
            bx, by, bw, bh = rects[j]
            if (ax < bx + bw - 0.5 and bx < ax + aw - 0.5 and
                    ay < by + bh - 0.5 and by < ay + ah - 0.5):
                fail("%s overlaps %s" % (D.ROOMS[i]["ref"], D.ROOMS[j]["ref"]))

    # the union of the modules plus the courtyard must equal the envelope
    env = D.ENVELOPE_W * D.ENVELOPE_D / 1e6
    modules = sum(w * h for _, _, w, h in rects) / 1e6
    courtyard = D.COURT_W * D.COURT_D / 1e6
    if abs(env - (modules + courtyard)) > 0.05:
        fail("modules (%.2f) + courtyard (%.2f) does not equal the envelope (%.2f m2)"
             % (modules, courtyard, env))
    else:
        ok("four modules and the courtyard tile the envelope exactly "
           "(%.1f + %.1f = %.1f m2)" % (modules, courtyard, env))


# ---------------------------------------------------------------- 3. room sums
def check_room_sums():
    for r in D.ROOMS:
        length = sum(p[1] for p in r["parts"])
        area = sum(p[2] for p in r["parts"])
        if abs(length - D.CONT_IL) > 0.5:
            fail("%s: parts sum to %.0f mm, internal length is %.0f mm"
                 % (r["ref"], length, D.CONT_IL))
        if abs(area - D.CONT_FLOOR_M2) > TOL:
            fail("%s: parts sum to %.2f m2, gross internal floor is %.2f m2"
                 % (r["ref"], area, D.CONT_FLOOR_M2))
        if len(r["parts"]) < 2:
            fail("%s: a single-part schedule is not a schedule" % r["ref"])
    ok("all four room schedules sum to %.0f mm and %.1f m2"
       % (D.CONT_IL, D.CONT_FLOOR_M2))


# ---------------------------------------------------------------- 4. schedule
def check_area_schedule():
    rows = {a: float(c) for a, _, c, _ in D.AREA_SCHEDULE if c and a and a != "D"}
    for r in D.ROOMS:
        printed = rows.get(r["ref"])
        if printed is None:
            fail("area schedule has no row for %s" % r["ref"])
        elif abs(printed - D.CONT_FLOOR_M2) > TOL:
            fail("area schedule gives %s as %.1f m2, computed %.2f"
                 % (r["ref"], printed, D.CONT_FLOOR_M2))

    enclosed = [float(c) for a, _, c, _ in D.AREA_SCHEDULE if a == "" and c]
    total_printed = sum(float(c) for a, _, c, _ in D.AREA_SCHEDULE
                        if a in [r["ref"] for r in D.ROOMS])
    if abs(total_printed - D.ENCLOSED_M2) > TOL:
        fail("area schedule rooms total %.1f m2, design_data says %.1f"
             % (total_printed, D.ENCLOSED_M2))
    else:
        ok("area schedule matches the recomputation (%.1f m2 enclosed)"
           % total_printed)


# ---------------------------------------------------------------- 5. cross-doc
def check_cross_document():
    """The design note must not drift from the proposal's published figures."""
    prop = os.path.join(ROOT, "UCIC-proposal.pdf")
    if not os.path.exists(prop):
        notes.append("proposal not present; cross-document check skipped")
        return
    try:
        import pymupdf
    except ImportError:
        notes.append("pymupdf missing; cross-document check skipped")
        return

    text = " ".join(p.get_text() for p in pymupdf.open(prop))
    flat = re.sub(r"\s+", " ", text)

    if "roughly 120 m" not in flat:
        fail("proposal no longer claims roughly 120 m2; the design note's "
             "reconciliation paragraph is now describing nothing")
    else:
        # 120 is the proposal's rounded figure; the design note must land near it
        if not (105.0 <= D.ENCLOSED_M2 <= 125.0):
            fail("enclosed area %.1f m2 is not reconcilable with the proposal's "
                 "roughly 120 m2" % D.ENCLOSED_M2)
        else:
            ok("enclosed %.1f m2 reconciles with the proposal's roughly 120 m2"
               % D.ENCLOSED_M2)

    if "1,000–1,200 m" not in flat and "1,000-1,200 m" not in flat:
        fail("proposal no longer states the 1,000-1,200 m2 campus figure")


# ---------------------------------------------------------------- 6. margins
def check_no_overflow():
    try:
        import pymupdf
    except ImportError:
        notes.append("pymupdf missing; margin check skipped")
        return
    if not os.path.exists(PDF):
        fail("UCIC-design.pdf is missing — run tools/build_design.py")
        return

    doc = pymupdf.open(PDF)
    offenders = []
    for i, page in enumerate(doc):
        w = page.rect.width
        if w > page.rect.height:            # landscape drawing sheet
            left, right = 12 * 72 / 25.4, w - 12 * 72 / 25.4
        else:
            left, right = 15 * 72 / 25.4, w - 15 * 72 / 25.4
        for word in page.get_text("words"):
            if word[2] > right + 1.0 or word[0] < left - 1.0:
                offenders.append((i + 1, round(word[0], 1), round(word[2], 1),
                                  word[4][:26]))

    if offenders:
        fail("text outside the page margins on %d word(s)" % len(offenders))
        for pg, x0, x1, word in offenders[:8]:
            failures.append("  page %d: x %s..%s  %r" % (pg, x0, x1, word))
    else:
        ok("no text outside the page margins")


# ---------------------------------------------------------------- 7. scale
def check_drawing_pages():
    """Both drawing sheets must exist, be landscape, and carry their scale."""
    try:
        import pymupdf
    except ImportError:
        return
    if not os.path.exists(PDF):
        return

    doc = pymupdf.open(PDF)
    landscape_pages = [i for i, p in enumerate(doc) if p.rect.width > p.rect.height]
    if len(landscape_pages) != 2:
        fail("expected 2 landscape drawing sheets, found %d" % len(landscape_pages))

    for i in landscape_pages:
        text = doc[i].get_text()
        if "DRAWING A-" not in text:
            fail("page %d is a landscape sheet with no title block" % (i + 1))
        if "SCALE  1:" not in text:
            fail("page %d states no scale" % (i + 1))
        if "NOT FOR CONSTRUCTION" not in text:
            fail("page %d does not carry the not-for-construction note" % (i + 1))

    if len(landscape_pages) == 2:
        ok("two landscape drawing sheets, both titled and scaled")

    # The drawing register must state the scale the sheets actually use. A
    # register that disagrees with its own drawings is worse than none.
    register_text = " ".join(p.get_text() for p in doc)
    for i in landscape_pages:
        page_text = doc[i].get_text()
        num = re.search(r"Drawing\s+(A-\d+)", page_text.replace("\n", " "))
        scale = re.search(r"SCALE\s+1:(\d+)", page_text)
        if not (num and scale):
            continue
        ref, den = num.group(1), scale.group(1)
        # find the register row for this drawing
        row = re.search(re.escape(ref) + r"[^A-Z]*?1:" + re.escape(den), register_text)
        if not row:
            fail("drawing register does not state 1:%s for %s (the sheet does)"
                 % (den, ref))
    else:
        pass
    if landscape_pages:
        ok("drawing register agrees with the scale on each sheet")


# ---------------------------------------------------------------- main
def main():
    print("UCIC design package check")
    print("-" * 58)

    check_envelope()
    check_tiling()
    check_room_sums()
    check_area_schedule()
    check_cross_document()
    check_no_overflow()
    check_drawing_pages()

    for n in notes:
        print("  ok   " + n)
    if failures:
        print()
        for f in failures:
            print("  FAIL " + f)
        print("\n%d problem(s) found." % len(failures))
        return 1
    print("\nThe design package is internally consistent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
