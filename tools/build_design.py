#!/usr/bin/env python3
"""
Build UCIC-design.pdf — the architectural design and plan note that
accompanies the proposal.

This is a separate document from UCIC-proposal.pdf. The proposal answers
"should we do this, and what does it cost"; this answers "what is it, how is
it put together, and can it be built at that cost". It reuses the proposal's
design system (colours, type, geometry) so the two read as one submission,
and draws the plans as real vector drawings at stated scales rather than
pasting in pictures of drawings.

Drawings are only credible if their arithmetic holds, so every dimension,
area and room name used here comes from tools/design_data.py, and
tools/check_design.py recomputes the areas from the container geometry
rather than trusting the numbers printed on the page.

The plan and section are landscape sheets, because a building 17 m wide does
not read at portrait width without shrinking the drawing below the point
where a dimension can be read.

Run:  python3 tools/build_design.py
Out:  UCIC-design.pdf (repository root)
"""

import os
import sys

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, KeepTogether, NextPageTemplate,
    PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import build_pdf as B                       # the proposal's design system
import design_data as D
from build_pdf import (                     # noqa: E402
    BODY, CONTENT_W, CREAM, F_BOLD, F_DISPLAY, F_DISPLAY_MED, F_SANS,
    F_SEMI, GOLD, GOLDLT, INK, MARGIN_B, MARGIN_L, MARGIN_R, MARGIN_T,
    MUTED, NAVY, NAVY2, RULE, RULELT, S, WHITE, callout, data_table,
    figure, rule, section_head,
)

OUT = os.path.join(B.ROOT, "UCIC-design.pdf")

# ---------------------------------------------------------------- landscape geometry
L_MARGIN = 15 * mm
A4L = landscape(A4)
L_W = A4L[0] - 2 * L_MARGIN

# Room for the title block above and the note below the drawing itself.
TITLE_H = 14 * mm
# Landscape sheets are drawing sheets: the notes are drawn on the same canvas
# as the drawing rather than stacked above it, so the drawing gets the frame.
DRW_W = A4L[0] - 2 * L_MARGIN
# Must match the drawing frame exactly (see main()); a flowable taller than
# its frame raises LayoutError rather than being clipped, which is a useful
# failure but only if the two numbers are derived from one definition.
FRAME_BOT = 10 * mm
FRAME_TOP_GAP = 8 * mm
# Reserve a margin beyond the title block. On exactly-fitting flowables
# reportlab splits to the next page rather than compressing, which silently
# produced a blank title page followed by a floating drawing.
TB_AND_MARGIN = TITLE_H + 10 * mm
DRW_H = A4L[1] - FRAME_BOT - FRAME_TOP_GAP - TB_AND_MARGIN


def fmt_mm(v):
    """Millimetres as metres, three decimals, trailing zeros trimmed."""
    return ("%.3f" % (v / 1000.0)).rstrip("0").rstrip(".")


# ---------------------------------------------------------------- drawing frame
class TitleBlock(Flowable):
    """Architectural title block: number, title, scale, status."""

    def __init__(self, number, title, scale, width, note=None):
        Flowable.__init__(self)
        self.number, self.title, self.scale = number, title, scale
        self.width, self.note = width, note
        self.height = 14 * mm

    def wrap(self, aw, ah):
        self.width = min(self.width, aw)
        return self.width, self.height

    def draw(self):
        """One compact band: number, title, scale, status on a single rule."""
        c = self.canv
        h = self.height
        c.setStrokeColor(NAVY)
        c.setLineWidth(1.3)
        c.line(0, 1.2, self.width, 1.2)

        base = h - 12.0
        c.setFont(F_BOLD, 6.4)
        c.setFillColor(GOLD)
        c.drawString(0, base, "DRAWING %s" % self.number)
        nw = c.stringWidth("DRAWING %s" % self.number, F_BOLD, 6.4)

        c.setFont(F_DISPLAY_MED, 11.6)
        c.setFillColor(NAVY)
        c.drawString(nw + 12, base - 1.2, self.title)

        c.setFont(F_SANS, 6.6)
        c.setFillColor(MUTED)
        c.drawRightString(self.width, base, "SCALE  %s" % self.scale)
        c.setFillColor(HexColor("#9A8570"))
        c.drawRightString(self.width, base - 9.0, "ILLUSTRATIVE — NOT FOR CONSTRUCTION")


class _Sheet(Flowable):
    """A drawing sheet: title block plus drawing, as one indivisible flowable.

    The title block was originally a separate flowable above the drawing. That
    pair summed to almost exactly the frame height, and reportlab resolves
    "almost" by moving the second half to the next page — leaving a sheet
    carrying a title and nothing else. Owning the title block makes the sheet
    the unit of pagination, which is also how a drawing register should behave.
    """

    TITLE = None        # (number, title, scale)

    def _draw_title(self, c, y_base):
        """Draw the title block band with its rule at y_base."""
        num, title, scale = self.TITLE
        c.setStrokeColor(NAVY)
        c.setLineWidth(1.3)
        c.line(0, y_base, self.width, y_base)

        # y_base is the rule between the title strip and the drawing
        c.setFont(F_BOLD, 6.4)
        c.setFillColor(GOLD)
        label = "DRAWING %s" % num
        c.drawString(0, y_base + 2.5, label)
        nw = c.stringWidth(label, F_BOLD, 6.4)

        c.setFont(F_DISPLAY_MED, 12.2)
        c.setFillColor(NAVY)
        c.drawString(nw + 12, y_base + 1.0, title)

        c.setFont(F_SANS, 6.6)
        c.setFillColor(MUTED)
        c.drawRightString(self.width, y_base + 7.5, "SCALE  %s" % scale)
        c.setFillColor(HexColor("#9A8570"))
        c.drawRightString(self.width, y_base + 1.0, "ILLUSTRATIVE — NOT FOR CONSTRUCTION")
    """Common layout for the two drawings.

    Each drawing declares a bounding box in model millimetres and a scale
    denominator, and is laid out at that scale. A stated scale is only honest
    if it is the scale actually drawn, so nothing is ever fitted to the frame
    and then labelled.
    """

    DENOM = 150.0

    def wrap(self, aw, ah):
        self.width = min(self.width, aw)
        return self.width, self.height

    def _place(self, bx0, by0, bw, bh, denom=None):
        """Return (pt_per_mm, ox, oy) placing the bbox at the stated scale."""
        s = (72.0 / 25.4) / (denom or self.DENOM)
        ox = (self.width - bw * s) / 2.0 - bx0 * s
        oy = (self.height - bh * s) / 2.0 - by0 * s
        return s, ox, oy


class PlanSheet(_Sheet):
    """Roof plan of the first cluster, drawn to scale from design_data."""

    DENOM = 150.0

    TITLE = ("A-101", "Roof plan — first cluster", "1:150 at A4 landscape")

    def __init__(self, width, height, denom=None):
        Flowable.__init__(self)
        self.width, self.height = width, height
        self.TITLE_H = 15 * mm
        if denom:
            self.DENOM = denom
        else:
            # pick the roundest scale that fills the drawing area; the scale
            # printed on the sheet is this number, not an afterthought
            avail_w = width - 4 * mm
            avail_h = height - self.TITLE_H - 4 * mm
            for d in (100, 125, 150, 200, 250, 300):
                sx = (72.0 / 25.4) / d
                if self.BW * sx <= avail_w and self.BH * sx <= avail_h:
                    self.DENOM = float(d)
                    break
            else:
                self.DENOM = 300.0
            self.TITLE = ("A-101", "Roof plan — first cluster",
                          "1:%d at A4 landscape" % int(self.DENOM))

    # The bbox is the bounding box of the whole drawing, dimension chains and
    # graphic scale included, so the scale can be chosen to fill the frame.
    # Bounding box of the whole sheet content, in model millimetres.
    # BY0 reaches below the graphic scale and key; the top clears the north
    # arrow. Getting this wrong does not throw — it silently lets the building
    # draw over the title strip.
    BX0, BY0 = -4800.0, -7100.0
    BW = D.ENVELOPE_W + 10800.0          # arrow sits east of the building
    BH = D.ENVELOPE_D + 9000.0           # BY0 -> ED + 1900

    def draw(self):
        c = self.canv
        L, W = D.CONT_L, D.CONT_W
        EW, ED = D.ENVELOPE_W, D.ENVELOPE_D

        self._draw_title(c, self.height - self.TITLE_H)

        sv = (72.0 / 25.4) / self.DENOM
        body_h = self.height - self.TITLE_H - 3 * mm
        ox = (self.width - self.BW * sv) / 2.0 - self.BX0 * sv
        oy = (body_h - self.BH * sv) / 2.0 - self.BY0 * sv
        s = sv

        def X(v):
            return ox + v * s

        def Y(v):
            return oy + v * s

        def box(x, y, w, h, **kw):
            c.rect(X(x), Y(y), w * s, h * s, **kw)

        c.saveState()

        # ---------- site apron and parking, south of the building.
        # Drawn first, and sized to stop at the building line: an apron that
        # overlaps the courtyard paints over the deck.
        c.setFillColor(HexColor("#F4EDE1"))
        c.setStrokeColor(HexColor("#DED4C2"))
        c.setLineWidth(0.4)
        box(-3600, -6900, EW + 7200, 6900, stroke=1, fill=1)

        # ---------- courtyard deck
        cx0, cy0 = W, W
        cw, ch = D.COURT_W, D.COURT_D
        c.setFillColor(HexColor("#EADCC2"))
        c.setStrokeColor(HexColor("#C6AC84"))
        c.setLineWidth(0.5)
        box(cx0, cy0, cw, ch, stroke=1, fill=1)

        # deck boards, drawn as individual strokes. A sub-half-point line
        # width here once rendered as a filled band and painted over half the
        # deck, so the width is kept at a visible 0.3 and the fill cleared.
        c.setStrokeColor(HexColor("#D9C6A4"))
        c.setFillColor(HexColor("#EADCC2"))
        c.setLineWidth(0.3)
        n = 26
        for i in range(1, n):
            c.line(X(cx0), Y(cy0 + ch * i / n), X(cx0 + cw), Y(cy0 + ch * i / n))

        # ---------- canopy outline over the deck.
        # Four separate strokes rather than a dashed rect: a rect here left a
        # stray filled path across the deck, and separate lines have no fill
        # to leak.
        c.setStrokeColor(HexColor("#8FA3B5"))
        c.setLineWidth(0.7)
        c.setDash(4, 3)
        ox0, oy0 = cx0 - 420, cy0 - 420
        ox1, oy1 = cx0 + cw + 420, cy0 + ch + 420
        c.line(X(ox0), Y(oy0), X(ox1), Y(oy0))
        c.line(X(ox1), Y(oy0), X(ox1), Y(oy1))
        c.line(X(ox1), Y(oy1), X(ox0), Y(oy1))
        c.line(X(ox0), Y(oy1), X(ox0), Y(oy0))
        c.setDash()

        # ---------- the four containers
        for r in D.ROOMS:
            if r["rot"] == 0:
                x, y, w, h = r["x"], r["y"], L, W
                faces_y = y + h if y < cy0 else y        # courtyard-facing edge
            else:
                x, y, w, h = r["x"], r["y"], W, L
                faces_x = x + w if x < cx0 else x

            c.setFillColor(NAVY)
            c.setStrokeColor(NAVY)
            c.setLineWidth(0.9)
            box(x, y, w, h, stroke=1, fill=1)

            # cedar reveal along the courtyard-facing long edge
            b = 170
            c.setFillColor(GOLDLT)
            if r["rot"] == 0:
                c.rect(X(x), Y(faces_y - (b if faces_y > y else 0)), w * s, b * s,
                       stroke=0, fill=1)
            else:
                c.rect(X(faces_x - (b if faces_x > x else 0)), Y(y), b * s, h * s,
                       stroke=0, fill=1)

            # reference and name, rotated to the module
            c.saveState()
            c.translate(X(x + w / 2.0), Y(y + h / 2.0))
            if r["rot"] == 90:
                c.rotate(90)
            c.setFillColor(WHITE)
            c.setFont(F_BOLD, 9.0)
            c.drawCentredString(0, 4.0, r["ref"])
            c.setFont(F_SANS, 5.8)
            c.setFillColor(HexColor("#9FB2C4"))
            c.drawCentredString(0, -6.5, r["short"].upper())
            c.restoreState()

        # ---------- specimen tree
        tx, ty = cx0 + cw * 0.40, cy0 + ch * 0.52
        c.setFillColor(HexColor("#AEC4A8"))
        c.setStrokeColor(HexColor("#7E9878"))
        c.setLineWidth(0.5)
        c.circle(X(tx), Y(ty), 1220 * s, stroke=1, fill=1)

        # ---------- dimension chains: three bay widths, then the overall
        self._dim_h(c, X, Y, 0, W, -1900, None)
        self._dim_h(c, X, Y, W, W + L, -1900, "%.3f" % (L / 1000.0))
        self._dim_h(c, X, Y, W + L, EW, -1900, None)
        self._dim_h(c, X, Y, 0, EW, -3200, "%.3f" % (EW / 1000.0))

        self._dim_v(c, X, Y, 0, 0, ED, "%.3f" % (ED / 1000.0), dx=-2400)
        self._dim_v(c, X, Y, 0, cy0, cy0 + ch, "%.3f" % (ch / 1000.0), dx=-2400)

        # ---------- north arrow, clear of the building
        nx, ny = X(EW) + 1300 * s, Y(ED + 900)
        c.setStrokeColor(NAVY)
        c.setFillColor(NAVY)
        c.setLineWidth(1.0)
        c.line(nx, ny - 16, nx, ny + 5)
        p_ = c.beginPath()
        p_.moveTo(nx, ny + 11)
        p_.lineTo(nx - 3.4, ny + 2.5)
        p_.lineTo(nx + 3.4, ny + 2.5)
        p_.close()
        c.drawPath(p_, stroke=0, fill=1)
        c.setFont(F_BOLD, 7.2)
        c.drawCentredString(nx, ny + 14.5, "N")

        # ---------- graphic scale, and the key
        self._scale_bar(c, s, X(0), Y(-4900))
        c.setFont(F_SANS, 6.4)
        c.setFillColor(MUTED)
        c.drawString(X(0), Y(-6350),
                     "Solid: container bodies.   Cedar: courtyard-facing reveal.   "
                     "Dashed: canopy above the deck.")

        c.restoreState()

    # -- annotation ------------------------------------------------
    def _dim_h(self, c, X, Y, x0, x1, y, label):
        c.setStrokeColor(HexColor("#7A8794"))
        c.setLineWidth(0.45)
        ya = Y(y)
        c.line(X(x0), ya, X(x1), ya)
        for xx in (x0, x1):
            c.line(X(xx), ya - 3.2, X(xx), ya + 3.2)
            # extension line back to the building
            c.setStrokeColor(HexColor("#C9C2B2"))
            c.setLineWidth(0.3)
            c.setDash(1.5, 2.2)
            c.line(X(xx), ya + 3.2, X(xx), Y(0))
            c.setDash()
            c.setStrokeColor(HexColor("#7A8794"))
            c.setLineWidth(0.45)
        if label:
            c.setFont(F_SANS, 7.2)
            c.setFillColor(HexColor("#46545F"))
            c.drawCentredString((X(x0) + X(x1)) / 2.0, ya + 5.0, label)

    def _dim_v(self, c, X, Y, x0, y0, y1, label, dx=-1600):
        c.setStrokeColor(HexColor("#7A8794"))
        c.setLineWidth(0.45)
        xa = X(x0) + dx
        c.line(xa, Y(y0), xa, Y(y1))
        for yy in (y0, y1):
            c.line(xa - 3.2, Y(yy), xa + 3.2, Y(yy))
        c.saveState()
        c.translate(xa - 5.5, (Y(y0) + Y(y1)) / 2.0)
        c.rotate(90)
        c.setFont(F_SANS, 7.2)
        c.setFillColor(HexColor("#46545F"))
        c.drawCentredString(0, 0, label)
        c.restoreState()

    def _scale_bar(self, c, s, x0, y0):
        seg = 2000 * s
        c.setStrokeColor(NAVY)
        c.setLineWidth(0.4)
        for i in range(5):
            c.setFillColor(NAVY if i % 2 == 0 else WHITE)
            c.rect(x0 + i * seg, y0, seg, 2.6 * mm, stroke=1, fill=1)
        c.setFont(F_SANS, 6.2)
        c.setFillColor(MUTED)
        for i in (0, 2, 4, 5):
            c.drawCentredString(x0 + i * seg, y0 - 7.5, "%d" % (i * 2))
        c.drawString(x0 + 5 * seg + 4, y0 - 7.5, "m")


class SectionSheet(_Sheet):
    """Section A-A, cut east-west through the courtyard looking north.

    Cuts the west and east wings, shows the deck between them, the canopy
    above the deck and the array above the roofs. Drawn true at 1:100.
    """

    # BY0 reaches below the ground line to take the graphic scale and note;
    # the top clears the array.
    BX0, BY0 = -3000.0, -6200.0
    BW = D.ENVELOPE_W + 7600.0
    BH = 12200.0

    TITLE = ("A-201", "Section A–A through the courtyard", "1:100 at A4 landscape")

    def __init__(self, width, height, denom=None):
        Flowable.__init__(self)
        self.width, self.height = width, height
        self.TITLE_H = 15 * mm
        if denom:
            self.DENOM = float(denom)
        else:
            avail_w = width - 6 * mm
            avail_h = height - self.TITLE_H - 6 * mm
            for d in (60, 75, 100, 125, 150, 200):
                sx = (72.0 / 25.4) / d
                if self.BW * sx <= avail_w and self.BH * sx <= avail_h:
                    self.DENOM = float(d)
                    break
            else:
                self.DENOM = 200.0
            self.TITLE = ("A-201", "Section A–A through the courtyard",
                          "1:%d at A4 landscape" % int(self.DENOM))

    def draw(self):
        c = self.canv
        L, W = D.CONT_L, D.CONT_W
        EW = D.ENVELOPE_W

        sv = (72.0 / 25.4) / self.DENOM
        body_h = self.height - self.TITLE_H
        ox = (self.width - self.BW * sv) / 2.0 - self.BX0 * sv
        oy = (body_h - self.BH * sv) / 2.0 - self.BY0 * sv
        s = sv

        self._draw_title(c, self.height - self.TITLE_H + 6)

        def X(v):
            return ox + v * s

        def Y(m):
            """Metres above finished floor level."""
            return oy + (m * 1000.0) * s

        c.saveState()

        # ---------- ground
        c.setStrokeColor(NAVY)
        c.setLineWidth(1.2)
        c.line(X(-2900), Y(0), X(EW + 2900), Y(0))
        c.setStrokeColor(HexColor("#C9C2B2"))
        c.setLineWidth(0.35)
        step = 2.4 * mm
        n = int((X(EW + 2900) - X(-2900)) / step)
        for i in range(n):
            xx = X(-2900) + i * step
            c.line(xx, Y(0), xx - 2.0, Y(0) - 2.6)

        # ---------- pad footings and stub columns
        for cx in (W / 2.0, EW - W / 2.0):
            c.setFillColor(HexColor("#DCD6C8"))
            c.setStrokeColor(HexColor("#B0A896"))
            c.setLineWidth(0.5)
            c.rect(X(cx) - 5 * mm, Y(0) - 7 * mm, 10 * mm, 7 * mm, stroke=1, fill=1)

        # ---------- the two wings, in section
        for cx, ref in ((W / 2.0, "C01"), (EW - W / 2.0, "C02")):
            bw_pt = W * s
            c.setFillColor(NAVY)
            c.setStrokeColor(NAVY)
            c.setLineWidth(0.8)
            c.rect(X(cx) - bw_pt / 2.0, Y(0), bw_pt, 2.896 * 1000 * s, stroke=1, fill=1)

            # independent ceiling line inside
            c.setStrokeColor(HexColor("#3F5972"))
            c.setLineWidth(0.4)
            c.setDash(2, 2)
            c.line(X(cx) - bw_pt / 2.0 + 2, Y(2.55),
                   X(cx) + bw_pt / 2.0 - 2, Y(2.55))
            c.setDash()

            # glazing
            c.setFillColor(HexColor("#5C7E9B"))
            c.rect(X(cx) - bw_pt / 2.0 + 1.3, Y(0.95), bw_pt - 2.6,
                   (2.30 - 0.95) * 1000 * s, stroke=0, fill=1)
            # cedar head and sill
            c.setFillColor(GOLDLT)
            c.rect(X(cx) - bw_pt / 2.0 + 1.3, Y(2.30), bw_pt - 2.6, 1.7, stroke=0, fill=1)
            c.rect(X(cx) - bw_pt / 2.0 + 1.3, Y(0.95) - 1.7, bw_pt - 2.6, 1.7,
                   stroke=0, fill=1)

            c.setFillColor(WHITE)
            c.setFont(F_BOLD, 7.6)
            c.drawCentredString(X(cx), Y(2.62), ref)
            c.setFont(F_SANS, 5.0)
            c.setFillColor(HexColor("#9FB2C4"))
            c.drawCentredString(X(cx), Y(2.40), "40FT HC")

        # ---------- courtyard deck
        dx0, dx1 = X(W + 140), X(EW - W - 140)
        c.setFillColor(HexColor("#EADCC2"))
        c.setStrokeColor(HexColor("#C6AC84"))
        c.setLineWidth(0.5)
        c.rect(dx0, Y(0), dx1 - dx0, 0.30 * 1000 * s, stroke=1, fill=1)
        c.setFont(F_SANS, 6.0)
        c.setFillColor(MUTED)
        c.drawCentredString((dx0 + dx1) / 2.0, Y(0) + 3.4,
                            "COVERED COURTYARD DECK — TIMBER ON PEDESTALS")

        # ---------- canopy and its posts
        can_x0, can_x1 = X(W - 420), X(EW - W + 420)
        c.setFillColor(NAVY2)
        c.setStrokeColor(NAVY2)
        c.rect(can_x0, Y(5.10), can_x1 - can_x0, 0.30 * 1000 * s, stroke=1, fill=1)
        c.setStrokeColor(GOLDLT)
        c.setLineWidth(0.7)
        c.line(can_x0 + 1, Y(5.07), can_x1 - 1, Y(5.07))
        for px in (W + 700, EW - W - 700):
            c.setFillColor(NAVY2)
            c.rect(X(px) - 1.4 * mm, Y(0), 2.8 * mm, 5.10 * 1000 * s, stroke=0, fill=1)

        # ---------- photovoltaic array
        arr_x0, arr_x1 = X(400), X(EW - 400)
        arr_y = Y(5.62)
        c.setFillColor(HexColor("#33495F"))
        c.setStrokeColor(HexColor("#33495F"))
        c.rect(arr_x0, arr_y, arr_x1 - arr_x0, 0.17 * 1000 * s, stroke=1, fill=1)
        c.setStrokeColor(HexColor("#4E6B8C"))
        c.setLineWidth(0.35)
        for i in range(1, 15):
            xx = arr_x0 + i * (arr_x1 - arr_x0) / 15.0
            c.line(xx, arr_y, xx, arr_y + 0.17 * 1000 * s)

        # ---------- levels at the right, with leader dots
        lx = X(EW + 400)
        for m, lab in ((0.0, "±0.000"), (2.896, "roof +2.896"),
                       (5.10, "canopy +5.100"), (5.62, "array +5.620")):
            yy = Y(m)
            c.setStrokeColor(HexColor("#C9C2B2"))
            c.setLineWidth(0.3)
            c.setDash(2, 2.6)
            c.line(X(-2600), yy, lx - 4, yy)
            c.setDash()
            c.setFont(F_SANS, 6.4)
            c.setFillColor(MUTED)
            c.drawString(lx, yy + 2.0, lab)

        # ---------- note and scale, both inside the drawing area below the strip
        c.setFont(F_SANS, 6.4)
        c.setFillColor(MUTED)
        c.drawString(X(-2900), Y(0) - 26 * mm,
                     "Section A–A cut east–west, looking north. Drawn true at 1:100. "
                     "Containers shown in section; canopy and array above.")
        self._scale(c, s, X(-2900), Y(0) - 13 * mm)

        c.restoreState()

    def _scale(self, c, s, x0, y0):
        seg = 2000 * s
        c.setStrokeColor(NAVY)
        c.setLineWidth(0.4)
        for i in range(5):
            c.setFillColor(NAVY if i % 2 == 0 else WHITE)
            c.rect(x0 + i * seg, y0, seg, 2.6 * mm, stroke=1, fill=1)
        c.setFont(F_SANS, 6.2)
        c.setFillColor(MUTED)
        for i in (0, 2, 4, 5):
            c.drawCentredString(x0 + i * seg, y0 - 7.5, "%d" % (i * 2))
        c.drawString(x0 + 5 * seg + 4, y0 - 7.5, "m")


# ---------------------------------------------------------------- page furniture
def draw_design_footer(canv, doc):
    canv.saveState()
    canv.setStrokeColor(RULELT)
    canv.setLineWidth(0.5)
    canv.line(MARGIN_L, 13.5 * mm, A4[0] - MARGIN_R, 13.5 * mm)
    canv.setFont(F_SANS, 6.9)
    canv.setFillColor(MUTED)
    canv.drawString(MARGIN_L, 9.6 * mm,
                    "Uganda Creative Innovation Centre  ·  Architectural design and plan note  ·  "
                    "Companion to the proposal")
    canv.setFont(F_SEMI, 7.2)
    canv.setFillColor(NAVY)
    canv.drawRightString(A4[0] - MARGIN_R, 9.6 * mm, str(doc.page))
    canv.restoreState()


def draw_landscape_footer(canv, doc):
    canv.saveState()
    canv.setStrokeColor(RULELT)
    canv.setLineWidth(0.5)
    canv.line(L_MARGIN, 10 * mm, A4L[0] - L_MARGIN, 10 * mm)
    canv.setFont(F_SANS, 6.4)
    canv.setFillColor(MUTED)
    canv.drawString(L_MARGIN, 6.4 * mm,
                    "UCIC  ·  First cluster  ·  Illustrative design, not for construction  ·  "
                    "Dimensions in metres")
    canv.setFont(F_SEMI, 6.8)
    canv.setFillColor(NAVY)
    canv.drawRightString(A4L[0] - L_MARGIN, 6.4 * mm, str(doc.page))
    canv.restoreState()


def draw_design_cover(canv, doc):
    """Cover: the aerial render above, the title block on navy below.

    Every element is positioned from the bottom of the navy panel rather than
    from the photograph, so changing the image height cannot make the ribbon
    collide with the title.
    """
    from reportlab.lib.utils import ImageReader

    canv.saveState()
    W, H = A4
    ir = ImageReader(os.path.join(B.ROOT, "images", "design-aerial.jpg"))
    iw, ih = ir.getSize()

    top_h = H * 0.50                      # photograph band
    k = max(W / iw, top_h / ih)
    dw, dh = iw * k, ih * k
    canv.drawImage(ir, (W - dw) / 2.0, H - top_h, dw, dh,
                   preserveAspectRatio=False, mask=None)

    # ---- navy panel below the photograph, with a scrim that fades the bottom
    # of the photograph into it. Without the scrim the title block sits on
    # foliage and is unreadable at any size.
    panel_h = H - top_h
    canv.setFillColor(NAVY)
    canv.rect(0, 0, W, panel_h, stroke=0, fill=1)

    # The scrim is opaque at the navy edge and clear at the top, with a
    # curve weighted toward the lower half so the title sits on solid navy.
    scrim_h = 58 * mm
    steps = 160
    for i in range(steps):
        f = i / float(steps - 1)
        alpha = min(1.0, 0.05 + 1.35 * (f ** 3.2))
        y = H - top_h - (scrim_h * f)
        canv.setFillColorRGB(0.039, 0.102, 0.184, alpha=alpha)
        canv.rect(0, y, W, scrim_h / steps + 1.1, stroke=0, fill=1)

    # ---- layout, measured up from the foot of the page
    foot_y = 17 * mm                      # provenance line
    meta_y = 34 * mm                      # document / status / date
    ribbon_y = 62 * mm                    # area ribbon
    body_y = H - top_h - 12 * mm          # title block, inside the opaque scrim

    canv.setFont(F_BOLD, 6.6)
    canv.setFillColor(GOLDLT)
    canv.drawString(MARGIN_L, body_y, "COMPANION DOCUMENT  ·  ARCHITECTURAL DESIGN AND PLAN")

    canv.setFont(F_DISPLAY_MED, 25)
    canv.setFillColor(WHITE)
    canv.drawString(MARGIN_L, body_y - 16 * mm, "Four containers,")
    canv.setFont(F_DISPLAY, 25)
    canv.setFillColor(HexColor("#E8DCC4"))
    canv.drawString(MARGIN_L, body_y - 27 * mm, "one courtyard.")

    canv.setFont(F_SANS, 8.8)
    canv.setFillColor(HexColor("#B9C7D3"))
    canv.drawString(MARGIN_L, body_y - 38 * mm,
                    "Design basis, plans, sections and schedules for the first cluster")
    canv.drawString(MARGIN_L, body_y - 44 * mm,
                    "of the Uganda Creative Innovation Centre.")

    # ---- area ribbon: the three figures that describe the building
    canv.setStrokeColor(HexColor("#2E4256"))
    canv.setLineWidth(0.6)
    canv.line(MARGIN_L, ribbon_y + 13 * mm, W - MARGIN_R, ribbon_y + 13 * mm)

    figs = [("ENCLOSED", "113.2 m²", "four containers"),
            ("COVERED DECK", "89.2 m²", "shared courtyard"),
            ("TOTAL COVERED", "202.4 m²", "first cluster")]
    cw = (W - MARGIN_L - MARGIN_R) / 3.0
    for i, (k_, v, sub) in enumerate(figs):
        x = MARGIN_L + i * cw
        canv.setFont(F_BOLD, 5.8)
        canv.setFillColor(GOLDLT)
        canv.drawString(x, ribbon_y + 7 * mm, k_)
        canv.setFont(F_DISPLAY_MED, 14.5)
        canv.setFillColor(WHITE)
        canv.drawString(x, ribbon_y - 3 * mm, v)
        canv.setFont(F_SANS, 6.4)
        canv.setFillColor(HexColor("#7E90A1"))
        canv.drawString(x, ribbon_y - 8.5 * mm, sub)

    # ---- document meta
    labels = (("DOCUMENT", "UCIC-DES-001"),
              ("STATUS", "Illustrative concept"),
              ("DATE", "November 2026"))
    for i, (k_, v) in enumerate(labels):
        x = MARGIN_L + i * cw
        canv.setFont(F_BOLD, 5.8)
        canv.setFillColor(GOLDLT)
        canv.drawString(x, meta_y + 4 * mm, k_)
        canv.setFont(F_SANS, 7.6)
        canv.setFillColor(HexColor("#E4EAF0"))
        canv.drawString(x, meta_y, v)

    canv.setFont(F_SANS, 6.2)
    canv.setFillColor(HexColor("#6E8092"))
    canv.drawString(MARGIN_L, foot_y,
                    "Illustrative architectural concept. Not an approved design, not for construction, "
                    "and not a depiction of any specific site.")
    canv.restoreState()


# ---------------------------------------------------------------- story
def build_story():
    # The cover is drawn entirely on the canvas, so the story must open with a
    # page break; without it the first section prints on top of the photograph.
    st = [PageBreak()]

    # ============ 01. purpose and design basis ============
    st.extend(section_head(
        "Design note 01",
        "What this document is, <i>and what it is not.</i>",
        "The proposal sets out why the facility should exist and what it costs. This note sets out what "
        "it physically is: the design basis, the plan, the section, the room schedules and the build "
        "sequence behind the facility chapter. It is a concept design package, not a construction set."))

    st.append(Paragraph(
        "Everything here follows from one decision taken in the proposal: the centre is built from "
        "standard 40ft high-cube shipping containers around a covered courtyard rather than as a "
        "conventional building. That decision is not stylistic. It fixes the structural grid, the "
        "acoustic strategy, the procurement route and the programme — and, because containers come in "
        "fixed lengths, the plan itself.", S["body"]))

    st.append(Paragraph(
        "A 40ft high-cube container is 12,192 mm long and 2,438 mm wide externally. Those two numbers "
        "generate the layout, and they are worth stating plainly because they explain why the courtyard "
        "scheme closes without cutting a single module down:", S["body"]))

    st.append(Spacer(1, 3))
    st.extend(data_table(
        ["Dimension", "Derivation", "Result"],
        [
            ("Envelope width", "L + 2W  (east and west wings at full 40ft)",
             "%s m" % fmt_mm(D.ENVELOPE_W)),
            ("Envelope depth", "L  (the wings are full 40ft)",
             "%s m" % fmt_mm(D.ENVELOPE_D)),
            ("Courtyard", "L wide  ×  (L − 2W) deep",
             "%s × %s m" % (fmt_mm(D.COURT_W), fmt_mm(D.COURT_D))),
            ("Courtyard deck", "covered, timber, external", "%.1f m²" % (D.COURT_W * D.COURT_D / 1e6)),
            ("Gross internal floor", "4 × 12.032 × 2.352", "%.1f m²" % D.ENCLOSED_M2),
            ("Total covered", "enclosed plus deck",
             "%.1f m²" % (D.ENCLOSED_M2 + D.COURT_W * D.COURT_D / 1e6)),
        ],
        widths=[CONTENT_W * 0.24, CONTENT_W * 0.44, CONTENT_W * 0.32],
        caption="Design basis — envelope dimensions derived from the 40ft high-cube module"))

    st.append(Spacer(1, 8))
    st.append(callout(
        "Why no module is cut down",
        "Every container in the scheme is a standard, uncut 40ft unit. Four modules can close a "
        "courtyard only if the two lengths are related by the module width — and 12,192 + 2 × 2,438 "
        "does exactly that. The consequence is commercial, not aesthetic: the design can be priced "
        "from a container supplier's standard list rather than from a fabrication drawing, and a "
        "replacement module can be bought off the shelf."))

    st.append(Spacer(1, 10))
    st.append(Paragraph("A note on the numbers", S["h3"]))
    st.append(Paragraph(
        "The proposal states roughly 120 m² of enclosed floor for the first cluster, plus the covered "
        "courtyard deck, against 1,000–1,200 m² for the full campus at completion. This note reconciles "
        "the first of those at design level: %.1f m² of enclosed floor across four containers, and "
        "%.1f m² of covered area once the courtyard deck is counted. The difference between the "
        "\"roughly 120 m²\" in the proposal and the %.1f m² drawn here is the service pod that the "
        "proposal's figure allows for; at design level the plant bay and WC sit inside the modules "
        "instead, which is why the enclosed figure is lower and the courtyard is larger. The larger "
        "campus figure remains a site capacity, not a first-phase build."
        % (D.ENCLOSED_M2, D.ENCLOSED_M2 + D.COURT_W * D.COURT_D / 1e6, D.ENCLOSED_M2), S["body"]))

    # ============ 02. principles ============
    st.append(PageBreak())
    st.extend(section_head(
        "Design note 02",
        "Five principles, <i>and the constraint each answers.</i>",
        "A container build has known failure modes — heat gain, condensation, acoustic flanking and a "
        "lego-block look. Each principle below is written against one of them rather than as a "
        "statement of intent."))

    principles = [
        ("01", "Acoustics first, then equipment",
         "A steel shell has almost no useful mass in the right places. Isolation is designed before "
         "the console is specified, and the acoustic line is protected in the budget so it cannot be "
         "value-engineered out."),
        ("02", "One storey, no exceptions",
         "Stacking would halve the footprint and ruin the brief. A single layer keeps every room at "
         "grade, needs no stairs and no lift, and makes the whole facility step-free by default."),
        ("03", "Shade the steel, not the glass",
         "Exposed steel conducts heat inward. A continuous canopy above the glazing and the "
         "photovoltaic array above the roof keep the envelope in shade, which is cheaper than "
         "cooling it."),
        ("04", "Every module can leave",
         "Foundations are pad footings, not a raft. Connections are bolted wherever the structure "
         "allows. If the site changes, the asset moves with the programme instead of being stranded."),
        ("05", "Repairable, not precious",
         "Cedar reveals, timber decks and glazed units are fixed so a single board or pane can be "
         "replaced by a local trade. Nothing depends on a proprietary system."),
    ]
    rows = []
    for n, h, p_ in principles:
        rows.append([
            Paragraph('<font name="%s" size="8.6" color="#B08D4F">%s</font>' % (F_DISPLAY_MED, n),
                      S["cell"]),
            Paragraph('<font name="%s">%s</font>' % (F_SEMI, h), S["cellb"]),
            Paragraph(p_, S["cell"]),
        ])
    t = Table(rows, colWidths=[10 * mm, CONTENT_W * 0.27,
                               CONTENT_W - 10 * mm - CONTENT_W * 0.27])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULELT),
    ]))
    st.append(t)

    st.append(Spacer(1, 12))
    st.append(figure("images/design-courtyard.jpg",
                     "Courtyard view from the deck, looking toward the studio wing. Cedar reveals and a "
                     "slatted canopy carry the warmth the steel alone would not.",
                     label="Figure A", aspect=16 / 8.6))

    # ============ 03. the plan (landscape drawing sheet) ============
    # The template must be switched *before* the break that lands on it,
    # otherwise the first drawing page is composed with portrait geometry and
    # the drawing overflows its frame onto an extra sheet.
    st.append(NextPageTemplate("drawing"))
    st.append(PageBreak())
    st.append(PlanSheet(DRW_W, DRW_H))

    # ============ 04. section (landscape drawing sheet) ============
    st.append(PageBreak())
    st.append(SectionSheet(DRW_W, DRW_H))

    # ============ 05. room schedules ============
    st.append(NextPageTemplate("body"))
    st.append(PageBreak())
    st.extend(section_head(
        "Design note 04",
        "Room schedules: <i>what each module contains.</i>",
        "Each container is a single 12.032 m internal length. The schedules show how that length is "
        "divided, what each division is for, and the area it yields."))

    for r in D.ROOMS:
        block = []
        block.append(Paragraph("%s · %s" % (r["ref"], r["name"]), S["h3"]))
        block.append(Paragraph("%s  ·  gross internal floor %.1f m²  ·  %s"
                               % (r["zone"], D.CONT_FLOOR_M2, r["spec"]), S["cap"]))
        rows = [(name, "%.2f m" % (plen / 1000.0), "%.1f m²" % parea)
                for name, plen, parea in r["parts"]]
        block.extend(data_table(
            ["Space", "Length", "Area"], rows,
            widths=[CONTENT_W * 0.46, CONTENT_W * 0.27, CONTENT_W * 0.27],
            total_row=["Total", "%.2f m" % (sum(p[1] for p in r["parts"]) / 1000.0),
                       "%.1f m²" % sum(p[2] for p in r["parts"])]))
        block.append(Spacer(1, 3))
        for lbl, val in (("Acoustics", r["acoustics"]), ("Services", r["services"])):
            block.append(Paragraph(
                "<font name='%s' color='#6B7885'>%s</font>&nbsp;&nbsp;%s" % (F_BOLD, lbl, val),
                ParagraphStyle("m", fontName=F_SANS, fontSize=7.8, leading=11.6, textColor=BODY)))
        block.append(Spacer(1, 9))
        # a room schedule that splits across pages is unreadable, and a heading
        # stranded at the foot of a page is worse; each block travels whole
        st.append(KeepTogether(block))

    st.append(rule(space_before=4, space_after=8))
    st.append(Paragraph("Area schedule", S["h3"]))
    st.extend(data_table(["Ref", "Space", "Area m²", "Acoustic class"],
                         [tuple(a) for a in D.AREA_SCHEDULE],
                         widths=[CONTENT_W * 0.09, CONTENT_W * 0.55,
                                 CONTENT_W * 0.18, CONTENT_W * 0.18],
                         caption="Schedule of areas — first cluster"))

    # ============ 06. build-up and levels ============
    st.append(PageBreak())
    st.extend(section_head(
        "Design note 05",
        "Build-up, levels and materials.",
        "The acoustic assembly set out as a number, the levels the building sets out from, and the "
        "short palette it is made from."))

    st.append(Paragraph("The studio build-up", S["h3"]))
    st.append(Paragraph(
        "The acoustic performance of the studios depends on one assembly, repeated. It is stated here "
        "so it can be priced line by line rather than bought as a lump sum, which is where acoustic "
        "budgets usually disappear.", S["body"]))
    st.extend(data_table(["Layer", "Specification", "Function"],
                         [tuple(x) for x in D.STUDIO_BUILDUP],
                         widths=[CONTENT_W * 0.24, CONTENT_W * 0.46, CONTENT_W * 0.30]))

    st.append(Spacer(1, 10))
    st.append(Paragraph("Levels", S["h3"]))
    st.append(Paragraph(
        "The building sits at a single finished floor level, ±0.000, with the deck above external "
        "ground so surface water runs away from it. Foundations are pad footings on compacted "
        "formation; there is no raft, which is what allows the modules to be lifted out again.",
        S["body"]))
    st.extend(data_table(["Level", "Element", "Note"],
                         [tuple(x) for x in D.LEVELS],
                         widths=[CONTENT_W * 0.14, CONTENT_W * 0.36, CONTENT_W * 0.50],
                         caption="Levels schedule"))

    st.append(Spacer(1, 10))
    st.append(KeepTogether(
        [Paragraph("Materials", S["h3"]),
         Paragraph("A deliberately short palette: easier to maintain, easier to price, "
                   "harder to get wrong.", S["body"])] +
        data_table(["Element", "Material", "Why"],
                   [tuple(x) for x in D.MATERIALS],
                   widths=[CONTENT_W * 0.22, CONTENT_W * 0.38, CONTENT_W * 0.40])))

    st.append(Spacer(1, 12))
    st.append(KeepTogether(
        [Paragraph("The courtyard as a room", S["h3"]),
         Paragraph("The deck is not circulation between rooms; it is the largest single space in "
                   "the building and the one that makes the scheme legible from outside. Its "
                   "programme is set out here so it can be designed rather than left over.",
                   S["body"])] +
        data_table(["Element", "Provision"],
                   [tuple(x) for x in D.COURT_PROGRAMME],
                   widths=[CONTENT_W * 0.34, CONTENT_W * 0.66])))

    st.append(Spacer(1, 10))
    st.append(callout(
        "Why the deck carries no structure of its own",
        "The canopy above the deck spans between the two long wings, so the deck needs no columns "
        "in the middle. That keeps the courtyard clear for performance, rehearsal and events, and "
        "it means the only structure in the courtyard is the canopy frame — which is also why the "
        "section reads as two buildings and a roof between them."))

    # ============ 07. programme ============
    st.append(PageBreak())
    st.extend(section_head(
        "Design note 06",
        "Build sequence: <i>why it opens in months.</i>",
        "The proposal claims the first cluster can be recording before a conventional building would "
        "be out of the ground. This is the sequence that makes the claim specific."))

    st.extend(data_table(["Stage", "Work", "Weeks", "Covers"],
                         [tuple(x) for x in D.STAGES],
                         widths=[CONTENT_W * 0.11, CONTENT_W * 0.23, CONTENT_W * 0.13,
                                 CONTENT_W * 0.53],
                         caption="Indicative construction sequence — first cluster"))

    st.append(Spacer(1, 10))
    st.append(Paragraph(
        "Two things matter more than the dates. The first is overlap: container supply runs "
        "concurrently with site works, and acoustic fit-out starts inside a module before the last one "
        "is set. A conventional build cannot do this, because the rooms do not exist until the "
        "structure is finished. The second is that commissioning includes acoustic testing, so the "
        "performance claimed in the room schedule is measured before handover rather than assumed.",
        S["body"]))

    st.append(Spacer(1, 8))
    st.append(callout(
        "What this design does not commit",
        "No site has been selected, no supplier engaged and no planning or building consent obtained. "
        "These drawings are an illustrative concept, prepared to test whether the facility chapter of "
        "the proposal can be built at the cost stated. They are not for construction and carry no "
        "structural, acoustic or services engineering."))

    # ============ 08. next stage ============
    st.append(PageBreak())
    st.extend(section_head(
        "Design note 07",
        "What the next stage <i>has to add.</i>",
        "This package is deliberately limited. The 90-day development phase in the proposal is where "
        "the following belongs, and each item is listed because it changes cost, programme or the "
        "design."))

    nexts = [
        ("Measured survey", "A topographic and boundary survey of the selected plot. Until it exists, "
                            "the site plan is a diagram, not a design."),
        ("Geotechnical report", "Founding conditions and soil aggressivity. Containers need to know "
                                "what they are sitting on, and laterite can be aggressive to steel."),
        ("Structural engineering", "Pad footing design, lifting points, canopy frame and the bolted "
                                   "connections between modules."),
        ("Acoustic modelling", "Predicted isolation and reverberation for each room before the lining "
                               "is fixed. The highest-risk item in the budget."),
        ("Thermal modelling", "Solar gain through glazing, canopy shading and ventilation strategy. "
                              "Kampala's climate allows a light-touch approach only if it is modelled."),
        ("Statutory approvals", "Planning permission, building consent and any change-of-use approval "
                                "for the plot, confirmed with the authority before design freeze."),
        ("Bill of quantities", "Priced from these drawings by a quantity surveyor, in local rates, "
                               "against the fourteen budget lines."),
        ("Services design", "Power, data, ventilation and fire strategy, coordinated with the acoustic "
                            "lining so ducts do not undo it."),
    ]
    st.extend(data_table(["Work item", "What it produces"], [tuple(a) for a in nexts],
                         widths=[CONTENT_W * 0.27, CONTENT_W * 0.73]))

    st.append(Spacer(1, 12))
    st.append(Paragraph("Drawing register", S["h3"]))
    st.extend(data_table(["Number", "Drawing", "Scale", "Status"],
                         [
                             ("A-101", "Roof plan — first cluster", "1:150 A4 landscape", "Concept"),
                             ("A-201", "Section A–A through courtyard", "1:100 A4 landscape", "Concept"),
                             ("A-301", "Room and area schedules", "—", "Concept"),
                             ("A-401", "Build-up, levels and materials", "—", "Concept"),
                             ("A-501", "Indicative construction sequence", "—", "Concept"),
                         ],
                         widths=[CONTENT_W * 0.14, CONTENT_W * 0.50,
                                 CONTENT_W * 0.20, CONTENT_W * 0.16]))

    st.append(Spacer(1, 16))
    st.append(rule(space_before=2, space_after=8))
    st.append(Paragraph(
        "Uganda Creative Innovation Centre · Architectural design and plan note. Companion to the "
        "proposal to the Minister of Gender, Labour and Social Development. All drawings are "
        "illustrative concepts, not for construction. Issued November 2026, Kampala, Uganda.",
        ParagraphStyle("fin", fontName=F_SANS, fontSize=7, leading=10.6, textColor=MUTED)))

    return st


def main():
    B.register_fonts()
    doc = BaseDocTemplate(
        OUT, pagesize=A4,
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=MARGIN_T, bottomMargin=MARGIN_B,
        title="Uganda Creative Innovation Centre — Architectural design and plan note",
        author="Uganda Creative Innovation Centre",
        subject="Design basis, plans, sections and schedules for the first container cluster",
        creator="UCIC design build",
    )
    frame_cover = Frame(MARGIN_L, MARGIN_B, CONTENT_W, A4[1] - MARGIN_T - MARGIN_B,
                        id="cover", leftPadding=0, rightPadding=0,
                        topPadding=0, bottomPadding=0)
    frame_body = Frame(MARGIN_L, MARGIN_B, CONTENT_W, A4[1] - MARGIN_T - MARGIN_B,
                       id="body", leftPadding=0, rightPadding=0,
                       topPadding=0, bottomPadding=0)
    from reportlab.platypus import Frame as _F
    # The title block sits above the drawing, so the drawing frame is the
    # sheet minus the title block and the running foot.
    frame_draw = _F(L_MARGIN, FRAME_BOT, L_W, DRW_H,
                    id="drawing", leftPadding=0, rightPadding=0,
                    topPadding=0, bottomPadding=0)
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[frame_cover], onPage=draw_design_cover),
        PageTemplate(id="body", frames=[frame_body], onPage=draw_design_footer),
        PageTemplate(id="drawing", frames=[frame_draw], pagesize=A4L,
                     onPage=draw_landscape_footer),
    ])
    story = [NextPageTemplate("body")] + build_story()
    doc.build(story)
    print("Wrote %s (%.0f KB)" % (OUT, os.path.getsize(OUT) / 1024.0))


if __name__ == "__main__":
    main()
