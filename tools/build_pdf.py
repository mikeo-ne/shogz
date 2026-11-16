#!/usr/bin/env python3
"""
Build UCIC-proposal.pdf — the print edition of the interactive proposal.

The PDF carries the same content and the same design language as index.html.
It is not a summary or an abridged version: it is the same document, laid out
for A4 and for a reader who wants paper.

Design system (mirrors css/style.css):
    navy #0A1A2F · ink #17232E · body #3C4A57 · muted #6B7885
    gold #B08D4F · gold-light #D3B47A · rule #DBD5C8 · cream #F4F1E8
    Fraunces (display) · Inter (text)

Run:  python3 tools/build_pdf.py
Out:  UCIC-proposal.pdf (repository root)
"""

import os
import sys

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, Image, KeepTogether, NextPageTemplate,
    PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle,
)
from reportlab.platypus.flowables import HRFlowable

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "UCIC-proposal.pdf")

# ---------------------------------------------------------------- palette
NAVY = HexColor("#0A1A2F")
NAVY2 = HexColor("#122941")
NAVY3 = HexColor("#1B3A57")
INK = HexColor("#17232E")
BODY = HexColor("#3C4A57")
MUTED = HexColor("#6B7885")
GOLD = HexColor("#B08D4F")
GOLDLT = HexColor("#D3B47A")
RULE = HexColor("#DBD5C8")
RULELT = HexColor("#E9E4D9")
CREAM = HexColor("#F4F1E8")
WHITE = colors.white
DARKTXT = HexColor("#B9C7D3")

# ---------------------------------------------------------------- fonts
def register_fonts():
    f = os.path.join(ROOT, "fonts")
    pairs = [
        ("Fraunces", "fraunces-latin-400-normal.ttf"),
        ("Fraunces-Med", "fraunces-latin-600-normal.ttf"),
        ("Fraunces-It", "fraunces-latin-400-italic.ttf"),
        ("Fraunces-MedIt", "fraunces-latin-600-italic.ttf"),
        ("Inter", "inter-latin-400-normal.ttf"),
        ("Inter-Med", "inter-latin-500-normal.ttf"),
        ("Inter-Semi", "inter-latin-600-normal.ttf"),
        ("Inter-Bold", "inter-latin-700-normal.ttf"),
    ]
    for name, fn in pairs:
        path = os.path.join(f, fn)
        if not os.path.exists(path):
            raise SystemExit(f"Missing font: {path}")
        pdfmetrics.registerFont(TTFont(name, path))
    pdfmetrics.registerFontFamily(
        "Inter", normal="Inter", bold="Inter-Bold",
        italic="Inter", boldItalic="Inter-Bold",
    )
    pdfmetrics.registerFontFamily(
        "Fraunces", normal="Fraunces", bold="Fraunces-Med",
        italic="Fraunces-It", boldItalic="Fraunces-MedIt",
    )


# ---------------------------------------------------------------- letter-spacing
def tracked(canv, x, y, text, font, size, tracking, color, align="left"):
    """Draw text with manual letter-spacing.

    reportlab's canvas has no setCharSpace in every build, so spacing is applied
    glyph by glyph. Widths come from the registered TTF metrics, which is what
    keeps the result identical to the browser's CSS letter-spacing."""
    total = 0.0
    for ch in text:
        total += pdfmetrics.stringWidth(ch, font, size) + tracking
    if tracking:
        total -= tracking
    if align == "right":
        x = x - total
    elif align == "center":
        x = x - total / 2.0

    canv.setFillColor(color)
    # Draw as one string with character spacing set on the text object, not
    # glyph by glyph. Drawing each character separately gives the same visual
    # kerning but a text layer of "R E P U B L I C" — which breaks copy,
    # search and accessibility in the PDF.
    t = canv.beginText(x, y)
    t.setFont(font, size)
    t.setCharSpace(tracking)
    t.textOut(text)
    t.setCharSpace(0)
    canv.drawText(t)
    return total


F_DISPLAY = "Fraunces"
F_DISPLAY_MED = "Fraunces-Med"
F_SANS = "Inter"
F_BOLD = "Inter-Bold"
F_SEMI = "Inter-Semi"

# ---------------------------------------------------------------- geometry
MARGIN_L = MARGIN_R = 16 * mm
MARGIN_T = 18 * mm
MARGIN_B = 20 * mm
CONTENT_W = A4[0] - MARGIN_L - MARGIN_R

# ---------------------------------------------------------------- styles
def styles():
    s = {}
    s["h2"] = ParagraphStyle("h2", fontName=F_DISPLAY_MED, fontSize=21,
                             leading=25, textColor=NAVY, spaceAfter=0)
    s["h2_light"] = ParagraphStyle("h2l", parent=s["h2"], textColor=WHITE)
    s["h2_cover"] = ParagraphStyle("h2c", fontName=F_DISPLAY_MED, fontSize=34,
                                   leading=37, textColor=WHITE)
    s["stand"] = ParagraphStyle("stand", fontName=F_SANS, fontSize=10.2,
                                leading=16.4, textColor=BODY, spaceBefore=7)
    s["stand_light"] = ParagraphStyle("standl", parent=s["stand"], textColor=HexColor("#A9BACA"))
    s["h3"] = ParagraphStyle("h3", fontName=F_DISPLAY_MED, fontSize=12.6,
                             leading=15.5, textColor=NAVY, spaceBefore=9, spaceAfter=4)
    s["h3_light"] = ParagraphStyle("h3l", parent=s["h3"], textColor=WHITE)
    s["h4"] = ParagraphStyle("h4", fontName=F_DISPLAY_MED, fontSize=10.6,
                             leading=13.4, textColor=NAVY, spaceAfter=3)
    s["h4_light"] = ParagraphStyle("h4l", parent=s["h4"], textColor=WHITE)
    s["body"] = ParagraphStyle("body", fontName=F_SANS, fontSize=9.3,
                               leading=15.4, textColor=BODY, spaceAfter=5)
    s["body_light"] = ParagraphStyle("bodyl", parent=s["body"], textColor=DARKTXT)
    s["lede"] = ParagraphStyle("lede", fontName=F_SANS, fontSize=10.4,
                               leading=17, textColor=INK, spaceAfter=8)
    s["small"] = ParagraphStyle("small", fontName=F_SANS, fontSize=7.6,
                                leading=11.6, textColor=MUTED)
    s["cap"] = ParagraphStyle("cap", fontName=F_SANS, fontSize=7.4,
                              leading=11, textColor=MUTED)
    s["cell"] = ParagraphStyle("cell", fontName=F_SANS, fontSize=8.1,
                               leading=12, textColor=BODY)
    s["cellb"] = ParagraphStyle("cellb", fontName=F_SEMI, fontSize=8.1,
                                leading=12, textColor=NAVY)
    s["cell_num"] = ParagraphStyle("celln", fontName=F_SANS, fontSize=8.1,
                                   leading=12, textColor=NAVY, alignment=TA_RIGHT)
    s["th"] = ParagraphStyle("th", fontName=F_BOLD, fontSize=6.9,
                             leading=9, textColor=NAVY)
    s["th_r"] = ParagraphStyle("thr", parent=s["th"], alignment=TA_RIGHT)
    s["cover_org"] = ParagraphStyle("corg", fontName=F_BOLD, fontSize=7,
                                    leading=9, textColor=GOLDLT)
    s["cover_sub"] = ParagraphStyle("csub", fontName=F_SANS, fontSize=11.6,
                                    leading=17.4, textColor=HexColor("#D3DCE4"))
    s["cover_purpose"] = ParagraphStyle("cpur", fontName=F_SANS, fontSize=8.2,
                                        leading=12.6, textColor=HexColor("#AEBDC9"))
    s["cover_dt"] = ParagraphStyle("cdt", fontName=F_BOLD, fontSize=6.4,
                                   leading=8.4, textColor=GOLDLT)
    s["cover_dd"] = ParagraphStyle("cdd", fontName=F_SANS, fontSize=8.2,
                                   leading=12.2, textColor=HexColor("#E4EAF0"))
    s["cover_prov"] = ParagraphStyle("cprov", fontName=F_SANS, fontSize=6.8,
                                     leading=10.4, textColor=HexColor("#7E90A1"))
    s["letter"] = ParagraphStyle("letter", fontName=F_SANS, fontSize=9.1,
                                 leading=15.2, textColor=BODY, spaceAfter=6)
    s["letter_meta"] = ParagraphStyle("lmeta", fontName=F_SANS, fontSize=8,
                                      leading=11.6, textColor=MUTED)
    s["letter_to"] = ParagraphStyle("lto", fontName=F_SANS, fontSize=8.8,
                                    leading=13.2, textColor=INK)
    s["letter_subj"] = ParagraphStyle("lsubj", fontName=F_BOLD, fontSize=8.8,
                                      leading=12.8, textColor=NAVY)
    s["toc_t"] = ParagraphStyle("toct", fontName=F_DISPLAY_MED, fontSize=10.6,
                                leading=13.4, textColor=NAVY)
    s["toc_d"] = ParagraphStyle("tocd", fontName=F_SANS, fontSize=7.8,
                                leading=11, textColor=MUTED, alignment=TA_RIGHT)
    s["figure_label"] = ParagraphStyle("fl", fontName=F_BOLD, fontSize=6.4,
                                       leading=9, textColor=GOLD)
    s["callout"] = ParagraphStyle("co", fontName=F_DISPLAY, fontSize=11.4,
                                  leading=17, textColor=NAVY)
    s["callout_light"] = ParagraphStyle("col", parent=s["callout"], textColor=HexColor("#E8EEF3"))
    s["kicker_txt"] = ParagraphStyle("kt", fontName=F_BOLD, fontSize=6.9,
                                     leading=9, textColor=GOLD)
    s["num"] = ParagraphStyle("num", fontName=F_SANS, fontSize=8.4,
                              leading=12, textColor=NAVY, alignment=TA_RIGHT)
    return s


S = styles()


# ---------------------------------------------------------------- helpers
class Kicker(Flowable):
    """Uppercase, letter-spaced label with a hairline rule, as in the web design."""

    def __init__(self, text, color=GOLD, size=6.9, tracking=1.5,
                 rule_color=RULE, width=None, space_before=0, space_after=0):
        Flowable.__init__(self)
        self.text = text.upper()
        self.color = color
        self.size = size
        self.tracking = tracking
        self.rule_color = rule_color
        self._w = width if width else CONTENT_W
        self.sb = space_before
        self.sa = space_after

    def wrap(self, aw, ah):
        self.width = min(self._w, aw)
        self.height = self.size + 6 + self.sb + self.sa
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        x0 = 0
        y = self.sa + 2
        tw = tracked(c, x0, y, self.text, F_BOLD, self.size, self.tracking, self.color)
        if self.rule_color is not None:
            c.setStrokeColor(self.rule_color)
            c.setLineWidth(0.6)
            c.line(x0 + tw + 6, y + self.size * 0.32,
                   min(self.width, x0 + tw + 6 + 34), y + self.size * 0.32)
        c.restoreState()


def rule(space_before=4, space_after=4, color=RULELT, thickness=0.5):
    return HRFlowable(width="100%", thickness=thickness, color=color,
                      spaceBefore=space_before, spaceAfter=space_after)


def card(flowables, bg=WHITE, border=RULE, pad=9, accent=None, accent_w=1.8,
         border_w=0.5, width=None):
    """A bordered block of flowables — the PDF equivalent of .panel."""
    t = Table([[flowables]], colWidths=[width or CONTENT_W])
    st = [
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), border_w, border),
        ("LEFTPADDING", (0, 0), (-1, -1), pad),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), pad),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    if accent:
        st.append(("LINEBEFORE", (0, 0), (0, -1), accent_w, accent))
    t.setStyle(TableStyle(st))
    return t


def fit_width(f, w):
    """Scale a flowable (and its nested tables) down to a column width.

    reportlab never reflows a Table into a narrower cell, so a card built at
    full page width silently overflows its column. This walks the tree and
    rescales column widths proportionally, which is what keeps multi-column
    blocks inside their gutter. Columns given an explicit None ("share the
    remainder") are preserved as fractions of the new total.
    """
    if isinstance(f, (list, tuple)):
        for x in f:
            fit_width(x, w)
        return f
    if not isinstance(f, Table):
        return f

    argw = list(getattr(f, "_argW", None) or [])
    if argw and w:
        numeric = [x for x in argw if x is not None]
        if numeric:
            n_none = len(argw) - len(numeric)
            known = float(sum(numeric))
            # Solve for the width of a None column so the total lands on w.
            if n_none:
                per_none = max((w - known) / n_none, 0)
                resolved = [per_none if x is None else x for x in argw]
            else:
                resolved = numeric
            total = float(sum(resolved))
            if total > 0 and abs(total - w) > 0.5:
                k = w / total
                f._argW = [max(x * k, 0.1) for x in resolved]
                f._colWidths = list(f._argW)
                f._width = None

    for row in (getattr(f, "_cellvalues", None) or []):
        for cell in row:
            if isinstance(cell, (list, tuple)):
                for x in cell:
                    fit_width(x, w)
            elif isinstance(cell, Table):
                fit_width(cell, w)
    return f


def two_col(left, right, gap=6 * mm, widths=None):
    """Two side-by-side cards with a gutter."""
    if widths is None:
        w = (CONTENT_W - gap) / 2.0
        widths = (w, w)
    fit_width(left, widths[0])
    fit_width(right, widths[1])
    t = Table([[left, "", right]], colWidths=[widths[0], gap, widths[1]])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


class CroppedImage(Flowable):
    """An image that fills its box at a fixed aspect ratio, cropping the excess.

    reportlab has no object-fit, so the source rectangle is computed here and
    passed to the canvas. The result matches the browser's object-fit: cover,
    which is what keeps the PDF looking like the web edition."""

    def __init__(self, path, width, aspect=16 / 9.0, hAlign="LEFT"):
        Flowable.__init__(self)
        self.path = path
        self.width = width
        self.height = width / aspect
        self.hAlign = hAlign
        from reportlab.lib.utils import ImageReader
        self.ir = ImageReader(path)
        self.iw, self.ih = self.ir.getSize()

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        target_aspect = self.width / self.height
        src_aspect = self.iw / float(self.ih)
        if src_aspect > target_aspect:
            # source is wider: crop left and right
            sh = self.ih
            sw = sh * target_aspect
            sx = (self.iw - sw) / 2.0
            sy = 0
        else:
            sw = self.iw
            sh = sw / target_aspect
            sx = 0
            sy = (self.ih - sh) / 2.0
        c.drawImage(self.ir, 0, 0, self.width, self.height,
                    mask=None,
                    preserveAspectRatio=False,
                    anchor='c')
        # drawImage has no source-rect crop, so we clip instead: scale the image
        # up so the cropped region fills the box, then clip to the box.
        c.saveState()
        p = c.beginPath()
        p.rect(0, 0, self.width, self.height)
        c.clipPath(p, stroke=0, fill=0)
        scale = max(self.width / self.iw, self.height / self.ih)
        dw, dh = self.iw * scale, self.ih * scale
        c.drawImage(self.ir, (self.width - dw) / 2.0, (self.height - dh) / 2.0,
                    dw, dh, mask=None, preserveAspectRatio=False)
        c.restoreState()


def figure(path, caption, label=None, width=CONTENT_W, aspect=16 / 9.0):
    """Image plus a rule-separated caption, framed as a figure block."""
    img = CroppedImage(os.path.join(ROOT, path), width, aspect=aspect)

    cap_txt = caption
    if label:
        cap_txt = ('<font name="%s" size="6.2" color="#B08D4F">%s</font>&nbsp;&nbsp;%s'
                   % (F_BOLD, label.upper(), caption))
    cap = Paragraph(cap_txt, S["cap"])

    inner = Table([[img], [cap]], colWidths=[width])
    inner.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (0, 0), 0),
        ("BOTTOMPADDING", (0, 0), (0, 0), 0),
        ("TOPPADDING", (0, 1), (0, 1), 5),
        ("BOTTOMPADDING", (0, 1), (0, 1), 6),
        ("LEFTPADDING", (0, 1), (0, 1), 8),
        ("RIGHTPADDING", (0, 1), (0, 1), 8),
        ("BACKGROUND", (0, 1), (0, 1), WHITE),
        ("LINEABOVE", (0, 1), (0, 1), 0.5, RULELT),
    ]))
    outer = Table([[inner]], colWidths=[width])
    outer.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    outer.hAlign = "LEFT"
    return outer


class CaptionBand(Flowable):
    """Cream band carrying a table caption, drawn above the table.

    A separate flowable rather than a nested table, because reportlab cannot
    split a table whose cell holds another table: when the caption-plus-table
    bundle did not fit, the table body was silently dropped from the PDF.
    Keeping the caption outside the table means the table can break normally.
    """

    def __init__(self, text, width, pad_x=7, pad_y=6, size=6.4):
        Flowable.__init__(self)
        self.text = text.upper()
        self.width = width
        self.h = size + pad_y * 2 + 1
        self.pad_x = pad_x
        self.size = size

    def wrap(self, aw, ah):
        self.width = min(self.width, aw)
        return self.width, self.h

    def draw(self):
        c = self.canv
        c.setFillColor(CREAM)
        c.rect(0, 0, self.width, self.h, stroke=0, fill=1)
        c.setFont(F_BOLD, self.size)
        c.setFillColor(MUTED)
        c.drawString(self.pad_x, self.h / 2.0 - self.size * 0.36, self.text)


class Badge(Flowable):
    """Small filled label with fixed width — a solid block, not a stretched cell."""

    def __init__(self, text, w=52 * mm, h=11, bg=GOLDLT, fg=NAVY, size=6.0):
        Flowable.__init__(self)
        self.text = text.upper()
        self.width = w
        self.height = h
        self.bg = bg
        self.fg = fg
        self.size = size

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(self.bg)
        c.rect(0, 0, self.width, self.height, stroke=0, fill=1)
        tracked(c, 4, 3.6, self.text, F_BOLD, self.size, 1.3, self.fg)


class BarChart(Flowable):
    """Horizontal bar chart drawn directly on the canvas.

    Drawn rather than assembled from nested tables so that it keeps its own
    proportions: reportlab will otherwise rescale nested tables to fill their
    column, which flattened every bar to full width."""

    def __init__(self, rows, width, max_value, gap=12.6, bar_h=3.2,
                 label_size=6.4, value_size=6.4):
        Flowable.__init__(self)
        self.rows = rows
        self.width = width
        self.max_value = float(max_value)
        self.gap = gap
        self.bar_h = bar_h
        self.label_size = label_size
        self.value_size = value_size
        self.value_w = 15 * mm
        self.height = len(rows) * gap

    def wrap(self, aw, ah):
        self.width = min(self.width, aw)
        return self.width, self.height

    def draw(self):
        c = self.canv
        track_w = self.width - self.value_w
        y = self.height - self.gap + 1.4
        for label, value in self.rows:
            c.setFont(F_SANS, self.label_size)
            c.setFillColor(BODY)
            c.drawString(0, y + 4.4, label)

            c.setFont(F_SANS, self.value_size)
            c.setFillColor(NAVY)
            c.drawRightString(self.width, y + 4.4, f"UGX {value:,}m")

            c.setFillColor(RULELT)
            c.rect(0, y, track_w, self.bar_h, stroke=0, fill=1)
            c.setFillColor(GOLD)
            w = max((value / self.max_value) * track_w, 1.2)
            c.rect(0, y, w, self.bar_h, stroke=0, fill=1)
            y -= self.gap


def banner(kicker, heading, standfirst=None, dark=True):
    """Section opening block: kicker, display heading, standfirst."""
    st_kick = Kicker(kicker, color=GOLDLT if dark else GOLD,
                     rule_color=HexColor("#5A6E80") if dark else RULE)
    flow = [st_kick, Spacer(1, 3),
            Paragraph(heading, S["h2_light"] if dark else S["h2"])]
    if standfirst:
        flow.append(Paragraph(standfirst, S["stand_light"] if dark else S["stand"]))
    if dark:
        t = Table([[flow]], colWidths=[CONTENT_W])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), NAVY),
            ("LEFTPADDING", (0, 0), (-1, -1), 16),
            ("RIGHTPADDING", (0, 0), (-1, -1), 16),
            ("TOPPADDING", (0, 0), (-1, -1), 16),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
        ]))
        return t
    return KeepTogether(flow)


def section_head(kicker, heading, standfirst=None, dark=False):
    return [banner(kicker, heading, standfirst, dark=dark), Spacer(1, 12)]


def numbered(items, style_body=None, marker_color=GOLD, num_w=13 * mm,
             numbered_style="decimal-leading-zero"):
    """A numbered list rendered as tight rows with gold markers."""
    style_body = style_body or S["body"]
    rows = []
    for i, txt in enumerate(items, start=1):
        n = str(i).zfill(2)
        rows.append([
            Paragraph('<font name="%s" size="9" color="#B08D4F">%s</font>' % (F_DISPLAY_MED, n),
                      ParagraphStyle("n", fontName=F_SANS, fontSize=9, leading=15)),
            Paragraph(txt, style_body),
        ])
    t = Table(rows, colWidths=[num_w, CONTENT_W - num_w])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULELT),
    ]))
    return t


def bullet_list(items, style_body=None, dash="\u00b7", color=GOLD, indent=10):
    t_rows = []
    for txt in items:
        t_rows.append([
            Paragraph('<font color="#B08D4F" size="11">%s</font>' % dash, style_body or S["body"]),
            Paragraph(txt, style_body or S["body"]),
        ])
    t = Table(t_rows, colWidths=[indent, CONTENT_W - indent])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 2.2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2),
    ]))
    return t


def data_table(headers, rows, widths, total_row=None, caption=None,
               first_col_bold=False):
    """Document table: cream header, hairline rules, optional total row."""
    head = []
    for h, w in zip(headers, widths):
        style = S["th_r"] if h.lower() in ("amount", "share") else S["th"]
        head.append(Paragraph(h.upper(), style))

    body = []
    for r in rows:
        cells = []
        for j, c in enumerate(r):
            if isinstance(c, Flowable):
                cells.append(c)
            elif j == len(r) - 1 and headers[j].lower() in ("amount", "share"):
                cells.append(Paragraph(str(c), S["cell_num"]))
            elif first_col_bold and j in (0, 1):
                cells.append(Paragraph(str(c), S["cellb"]))
            else:
                cells.append(Paragraph(str(c), S["cell"]))
        body.append(cells)

    data = [head] + body
    if total_row:
        t_cells = []
        for j, c in enumerate(total_row):
            if j == len(total_row) - 1:
                t_cells.append(Paragraph(str(c), S["cell_num"]))
            else:
                t_cells.append(Paragraph(str(c), S["cellb"]))
        data.append(t_cells)

    t = Table(data, colWidths=widths, repeatRows=1)
    st = [
        ("BACKGROUND", (0, 0), (-1, 0), CREAM),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 1), (-1, -2), 0.4, RULELT),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [WHITE, HexColor("#FCFBF7")]),
    ]
    if total_row:
        st += [
            ("BACKGROUND", (0, -1), (-1, -1), CREAM),
            ("LINEABOVE", (0, -1), (-1, -1), 0.9, NAVY),
            ("LINEBELOW", (0, -1), (-1, -1), 0, WHITE),
        ]
    t.setStyle(TableStyle(st))
    t.hAlign = "LEFT"
    if caption:
        return [CaptionBand(caption, CONTENT_W), Spacer(1, 0), t]
    return [t]


def callout(kicker, text, dark=False):
    st_k = Kicker(kicker, color=GOLDLT if dark else GOLD,
                  rule_color=None)
    body_style = S["callout_light"] if dark else S["callout"]
    flow = [st_k, Spacer(1, 2), Paragraph(text, body_style)]
    t = Table([[flow]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#1A2C42") if dark else HexColor("#F5F2EA")),
        ("LINEBEFORE", (0, 0), (0, -1), 2, GOLDLT if dark else GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


# ---------------------------------------------------------------- budget data
# Mirrors BUDGET in js/main.js. tools/verify_parity.py asserts the two match.
BUDGET = [
    ("Feasibility, legal, architectural & engineering", 150,
     "Studies, legal structuring, concept design and technical assessments."),
    ("Property deposit, lease preparation & initial occupancy", 120,
     "Initial occupancy costs for an existing premises; final amount depends on the property route."),
    ("Building renovation & infrastructure", 500,
     "Building adaptation, internal works, circulation, finishes and essential infrastructure."),
    ("Acoustic engineering & treatment", 300,
     "Sound isolation, room acoustics and treatment for professional music spaces."),
    ("Music production equipment", 350,
     "Priority recording, production, mixing and mastering equipment."),
    ("Film, photography & digital media equipment", 300,
     "Cameras, lighting, editing and related production equipment for phased services."),
    ("Computers, software, networking & storage", 180,
     "Workstations, licensed tools, network infrastructure and secure storage."),
    ("Electrical systems & backup power", 220,
     "Electrical upgrades, distribution, protection and backup power."),
    ("Furniture & shared facilities", 150,
     "Learning, collaboration, reception, office and shared-use furniture."),
    ("Safety, security & accessibility", 80,
     "Fire and life safety, access control, security and accessibility improvements."),
    ("Recruitment & staff training", 70,
     "Core team mobilisation, onboarding and operational training."),
    ("Launch & outreach", 30,
     "Public information, launch activities and beneficiary outreach."),
    ("Initial operating reserve", 350,
     "Initial working-capital buffer; not a multi-year operating commitment."),
    ("Contingency", 200,
     "Preliminary provision for unforeseen establishment costs."),
]
BUDGET_TOTAL = sum(b[1] for b in BUDGET)


def ugx(n):
    return f"UGX {n:,}m"


def pct(n):
    return f"{n / BUDGET_TOTAL * 100:.1f}%"


# ---------------------------------------------------------------- page furniture
def draw_footer(canv, doc):
    canv.saveState()
    canv.setStrokeColor(RULELT)
    canv.setLineWidth(0.5)
    canv.line(MARGIN_L, 13.5 * mm, A4[0] - MARGIN_R, 13.5 * mm)
    canv.setFont(F_SANS, 6.9)
    canv.setFillColor(MUTED)
    canv.drawString(MARGIN_L, 9.6 * mm,
                    "Uganda Creative Innovation Centre  ·  Proposal to the Minister of Gender, Labour and Social Development")
    canv.setFont(F_SEMI, 7.2)
    canv.setFillColor(NAVY)
    canv.drawRightString(A4[0] - MARGIN_R, 9.6 * mm, str(doc.page))
    canv.restoreState()


def draw_cover(canv, doc):
    """Full-bleed cover: photograph, smooth navy fade, title block.

    All vertical positions are expressed in millimetres *from the top of the
    page* and converted once, because that is how the layout was designed and
    it makes overlaps obvious in review."""
    from reportlab.lib.utils import ImageReader

    pw, ph = A4
    H = 297.0  # page height in mm

    def y(top_mm):
        """Convert a distance from the top of the page to a canvas y."""
        return ph - top_mm * mm

    canv.saveState()

    # ---- navy ground
    canv.setFillColor(NAVY)
    canv.rect(0, 0, pw, ph, stroke=0, fill=1)

    # ---- photograph, top 78% of the page, cover-fitted
    img_path = os.path.join(ROOT, "images/campus-exterior.jpg")
    ir = ImageReader(img_path)
    iw, ih = ir.getSize()
    img_top_mm, img_bot_mm = 0.0, 200.0
    img_h = (img_bot_mm - img_top_mm) * mm
    scale = max(pw / iw, img_h / ih)
    dw, dh = iw * scale, ih * scale
    canv.drawImage(ir, (pw - dw) / 2.0, y(img_bot_mm), dw, dh,
                   preserveAspectRatio=False, mask=None)

    # ---- uniform wash so white type holds over any part of the image
    canv.setFillColor(NAVY)
    canv.setFillAlpha(0.46)
    canv.rect(0, y(img_bot_mm), pw, img_h, stroke=0, fill=1)
    canv.setFillAlpha(1)

    # ---- vertical fade to solid navy.
    #     Smooth: 600 bands, each overlapping its neighbour by half a step, and
    #     an ease-in curve so the transition never reads as banding.
    steps = 600
    fade_bot_mm = 30.0     # fully solid navy below this line from the image bottom
    fade_top_mm = 118.0    # fade begins here from the image bottom
    span = fade_top_mm - fade_bot_mm
    for i in range(steps):
        t = i / (steps - 1.0)
        a_mm = fade_top_mm - t * span
        alpha = (t ** 1.35)
        band_h = (span / steps) * 1.9
        canv.setFillColor(NAVY)
        canv.setFillAlpha(min(1.0, alpha))
        canv.rect(0, y(img_bot_mm - a_mm + band_h), pw, band_h * mm, stroke=0, fill=1)
    canv.setFillAlpha(1)

    # Solid navy from the point where the fade completes, down to the foot of
    # the page. Without this the band loop left a partially darkened strip and
    # the "Submitted to" row sat over the photograph and could not be read.
    cutoff_top_mm = img_bot_mm - fade_bot_mm
    canv.setFillColor(NAVY)
    canv.rect(0, 0, pw, ph - cutoff_top_mm * mm, stroke=0, fill=1)

    # ---- masthead
    tracked(canv, MARGIN_L, y(19), "REPUBLIC OF UGANDA", F_BOLD, 7, 2.4, GOLDLT)
    canv.setStrokeColor(GOLDLT)
    canv.setLineWidth(0.7)
    canv.line(MARGIN_L, y(22.5), MARGIN_L + 44 * mm, y(22.5))

    # ---- title
    canv.setFillColor(WHITE)
    canv.setFont(F_DISPLAY_MED, 32)
    canv.drawString(MARGIN_L, y(119), "The Uganda Creative")
    canv.drawString(MARGIN_L, y(131.5), "Innovation Centre")

    # ---- subtitle
    canv.setFillColor(HexColor("#D6E0E8"))
    canv.setFont(F_SANS, 10.4)
    canv.drawString(MARGIN_L, y(146), "A public facility where Ugandan music is recorded,")
    canv.drawString(MARGIN_L, y(151.6), "taught and turned into a livelihood.")

    # ---- purpose, with a gold rule
    canv.setStrokeColor(GOLD)
    canv.setLineWidth(1.3)
    canv.line(MARGIN_L, y(158.5), MARGIN_L, y(171.5))
    canv.setFillColor(HexColor("#B7C6D2"))
    canv.setFont(F_SANS, 7.8)
    canv.drawString(MARGIN_L + 4.6 * mm, y(163), "A proposal submitted for the consideration of the Minister of")
    canv.drawString(MARGIN_L + 4.6 * mm, y(167.4), "Gender, Labour and Social Development")

    # ---- meta grid
    canv.setStrokeColor(HexColor("#3A4E62"))
    canv.setLineWidth(0.6)
    canv.line(MARGIN_L, y(178), pw - MARGIN_R, y(178))

    meta = [
        ("SUBMITTED TO", "Hon. Lt. Gen. (Rtd) Henry Tumukunde",
         "Minister of Gender, Labour and Social Development"),
        ("SUBMITTED BY", "Promoters of the Uganda Creative Innovation Centre",
         "Kampala, Uganda"),
        ("SUBJECT", "Establishment of a national music and creative",
         "production facility · UGX 3.0bn indicative framework"),
        ("DATE", "November 2026", "Version 1.0 \u2014 for discussion"),
    ]
    col_w = CONTENT_W / 2.0
    for i, (label, line1, line2) in enumerate(meta):
        cx = MARGIN_L + (i % 2) * col_w
        row_top = 186.5 + (i // 2) * 19.5
        tracked(canv, cx, y(row_top), label, F_BOLD, 6.1, 1.5, GOLDLT)
        canv.setFont(F_SANS, 8.1)
        canv.setFillColor(HexColor("#E6ECF2"))
        canv.drawString(cx, y(row_top + 5.0), line1)
        canv.setFont(F_SANS, 7.3)
        canv.setFillColor(HexColor("#94A6B7"))
        canv.drawString(cx, y(row_top + 9.4), line2)

    # ---- provenance
    canv.setStrokeColor(HexColor("#31465A"))
    canv.setLineWidth(0.5)
    canv.line(MARGIN_L, y(233), pw - MARGIN_R, y(233))
    canv.setFillColor(HexColor("#7E90A1"))
    canv.setFont(F_SANS, 6.4)
    canv.drawString(MARGIN_L, y(238.5),
                    "Submitted through the Office of the Minister. This document is a proposal for "
                    "consideration; it is not an approved")
    canv.drawString(MARGIN_L, y(242.2),
                    "government project, a procurement document or a commitment of public funds.")

    # ---- figure disclaimer
    canv.setFont(F_SANS, 6.2)
    canv.setFillColor(HexColor("#6F8296"))
    canv.drawString(MARGIN_L, y(288),
                    "ILLUSTRATIVE CONCEPT \u2014 NOT AN APPROVED ARCHITECTURAL DESIGN")
    canv.restoreState()


# ---------------------------------------------------------------- content
def build_story():
    st = []

    # ============ 2. Letter of transmittal ============
    st.append(PageBreak())
    st.append(Kicker("Transmittal", color=GOLD))
    st.append(Spacer(1, 4))
    st.append(Paragraph("Letter of transmittal", S["h2"]))
    st.append(Spacer(1, 10))

    st.append(Paragraph("OFFICE OF THE PROMOTERS<br/>UGANDA CREATIVE INNOVATION CENTRE<br/>KAMPALA, UGANDA",
                        S["letter_meta"]))
    st.append(Spacer(1, 10))
    st.append(Paragraph("15 November 2026", S["letter_meta"]))
    st.append(Spacer(1, 12))

    st.append(Table([[Paragraph(
        "Hon. Lt. Gen. (Rtd) Henry Tumukunde<br/>"
        "Minister of Gender, Labour and Social Development<br/>"
        "Ministry of Gender, Labour and Social Development<br/>Kampala", S["letter_to"])]],
        colWidths=[CONTENT_W],
        style=TableStyle([
            ("LINEBEFORE", (0, 0), (0, -1), 1.6, GOLD),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ])))
    st.append(Spacer(1, 14))
    st.append(Paragraph("Honourable Minister,", S["letter"]))
    st.append(Spacer(1, 6))

    st.append(Paragraph(
        "Subject: Proposal for the Establishment of the Uganda Creative Innovation Centre",
        S["letter_subj"]))
    st.append(Spacer(1, 3))
    st.append(rule(2, 10, RULE, 0.6))

    letter_paras = [
        "We write to submit for your consideration a proposal to establish the Uganda Creative Innovation "
        "Centre (UCIC) — a public facility in Kampala where Ugandan musicians, producers and engineers can "
        "record, train and earn, and from which film, photography and creative enterprise programmes can "
        "later grow.",

        "The proposal proceeds from a straightforward observation. Uganda's music is heard across the region, "
        "but the means of producing it are not widely available. A young producer with talent and a phone "
        "still has no quiet room, no maintained console and no one to show them how to use it. The constraint "
        "is infrastructure and instruction, not ability. That is the gap this proposal addresses.",

        "It is submitted to your Ministry because the outcomes it seeks are the outcomes your Ministry is "
        "mandated to deliver: decent work for young people, economic participation by women, and opportunity "
        "for persons with disabilities. It is not proposed as a new bureaucracy. It is proposed as a shared "
        "production facility that existing Ministry programmes — the Youth Livelihood Programme, the Uganda "
        "Women Entrepreneurship Programme, the GROW project and the Social Assistance Grants for Empowerment "
        "— can direct their beneficiaries into, so that training and revolving credit are matched with "
        "somewhere to actually produce.",

        "The document sets out the public case, the fit with the Ministry's mandate, the proposed facility, "
        "the programme model, an indicative establishment framework of UGX 3.0 billion, the governance "
        "safeguards we propose, and the specific decisions we respectfully request of you.",

        "We would welcome the opportunity to present the proposal in person at your convenience, and to answer "
        "any question the Ministry may have on its assumptions, costings or structure.",
    ]
    for p in letter_paras:
        st.append(Paragraph(p, S["letter"]))

    st.append(Spacer(1, 10))
    st.append(Paragraph("Respectfully submitted,", S["letter"]))
    st.append(Spacer(1, 22))
    st.append(Table([[""]], colWidths=[62 * mm], rowHeights=[9 * mm],
                    style=TableStyle([("LINEBELOW", (0, 0), (0, 0), 0.5, RULE)])))
    st.append(Spacer(1, 4))
    st.append(Paragraph("For and on behalf of the Promoters",
                        ParagraphStyle("sg", fontName=F_SEMI, fontSize=8.4,
                                       leading=11, textColor=NAVY)))
    st.append(Paragraph("Uganda Creative Innovation Centre · Kampala", S["small"]))

    # ============ 3. Contents ============
    st.append(PageBreak())
    st.append(Kicker("Contents", color=GOLD))
    st.append(Spacer(1, 4))
    st.append(Paragraph("The document at a glance", S["h2"]))
    st.append(Spacer(1, 14))

    toc = [
        ("Executive summary", "What is proposed, and what it costs"),
        ("1 · Background and public case", "Why production infrastructure is the constraint"),
        ("2 · Fit with the Ministry's mandate", "How UCIC plugs into existing programmes"),
        ("3 · The proposed facility", "Rooms, layout and technical scope"),
        ("4 · Programmes and access model", "Who uses it, how they are selected, what it costs them"),
        ("5 · Indicative investment framework", "UGX 3.0bn across fourteen budget lines"),
        ("6 · Governance, audit and public value", "Safeguards, oversight and the measures we will report"),
        ("7 · Delivery roadmap", "A 24-month sequence, music first"),
        ("8 · Decisions requested", "Six specific requests, and the immediate next step"),
        ("Annexes", "Budget schedule, assumptions, glossary"),
    ]
    rows = []
    for t, d in toc:
        rows.append([Paragraph(t, S["toc_t"]), Paragraph(d, S["toc_d"])])
    tt = Table(rows, colWidths=[CONTENT_W * 0.5, CONTENT_W * 0.5])
    tt.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULELT),
        ("LINEABOVE", (0, 0), (-1, 0), 0.6, RULE),
    ]))
    st.append(tt)
    st.append(Spacer(1, 16))
    st.append(Paragraph(
        "This document is also published as an interactive web edition at "
        "ucic-music.vercel.app. The two carry the same content; this edition is "
        "the copy for print and circulation.", S["small"]))

    # ============ 4. Executive summary ============
    st.append(PageBreak())
    st.extend(section_head(
        "Executive summary",
        'Record. Produce. <i>Learn. Earn.</i>',
        "A UGX 3.0 billion establishment framework to create a national music and creative production "
        "facility in Kampala, opening with music and expanding into film, photography and creative "
        "enterprise over twenty-four months."))

    left = [
        Paragraph(
            "The Uganda Creative Innovation Centre is proposed as a single, professionally managed public "
            "facility of approximately 1,000–1,200 m² in Kampala. Its first operational phase is music: a live "
            "room, a control room, an acoustically isolated vocal booth and a producer lab, supported by a "
            "structured training and mentorship programme and a fair booking system.", S["body"]),
        Paragraph(
            "Access is free at the point of use for selected artists, producers and engineers, and subsidised "
            "for others through a published schedule. The facility is not a private studio or a closed "
            "membership club. It is a public platform with clear eligibility, transparent selection, "
            "published service standards and audited accounts.", S["body"]),
        Paragraph(
            "Of the UGX 3.0 billion indicative envelope, UGX 650 million is music-specific. The framework "
            "assumes an existing suitable building secured through lease or institutional arrangement; it "
            "does not assume land purchase or new construction. All figures are preliminary and require "
            "feasibility assessment, a bill of quantities and supplier quotations before any commitment.",
            S["body"]),
    ]

    figure_rows = [
        ("Indicative establishment envelope", "UGX 3.0bn"),
        ("Music-specific allocation", "UGX 650m"),
        ("Usable facility area", "1,000–1,200 m²"),
        ("To full programme", "24 months"),
        ("Budget lines", "14"),
    ]
    fig_cells = []
    for label, val in figure_rows:
        fig_cells.append([
            Paragraph(label, ParagraphStyle("fl2", fontName=F_SANS, fontSize=7.6,
                                            leading=10.6, textColor=HexColor("#9FB0C0"))),
            Paragraph(val, ParagraphStyle("fv", fontName=F_DISPLAY_MED, fontSize=12.2,
                                          leading=15, textColor=WHITE, alignment=TA_RIGHT)),
        ])
    gap = 9 * mm
    left_w = (CONTENT_W - gap) * 0.58
    right_w = (CONTENT_W - gap) * 0.42
    fig_tbl = Table(fig_cells, colWidths=[right_w - 33 * mm - 26, 33 * mm])
    fig_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, HexColor("#2E4256")),
    ]))

    right = card(
        [Kicker("Headline figures", color=GOLDLT, rule_color=None),
         Spacer(1, 7), fig_tbl, Spacer(1, 8),
         Paragraph("Preliminary planning estimate. Excludes land purchase, new construction and a "
                   "multi-year operating budget.", S["small"])],
        bg=NAVY, border=NAVY, pad=13, accent=GOLD, accent_w=3.2, width=right_w)

    st.append(two_col(left, right, gap=gap, widths=(left_w, right_w)))
    st.append(Spacer(1, 14))
    st.append(callout(
        "The proposition in one sentence",
        "Uganda already has the talent; what it lacks is a small number of properly built, properly run "
        "rooms where that talent can be trained and paid — and the Ministry already has the beneficiaries, "
        "the programmes and the mandate to fill them."))

    # ============ 5. Section 1 — background ============
    st.append(PageBreak())
    st.extend(section_head(
        "Section 1",
        "Uganda's music travels.<br/><i>Its studios don't.</i>",
        "Uganda's music is heard on every street, station and phone in the region. The capacity to produce "
        "it remains concentrated, expensive and largely informal.", dark=True))

    st.append(figure("images/studio-control-room.jpg",
                     "Control room, illustrative concept. Large-format console, main and nearfield "
                     "monitoring, outboard rack and direct sightline into the live room.",
                     label="Figure 1", aspect=16 / 6.0))
    st.append(Spacer(1, 14))
    st.append(two_col(
        [Paragraph(
            "A generation of Ugandan artists has demonstrated that the market for this country's music is "
            "regional and, increasingly, global. That success has been achieved largely without corresponding "
            "investment in the means of production. Recording capacity in Kampala is limited, uneven in "
            "quality and priced for those who already have income.", S["body"]),
         Paragraph(
            "The consequences are practical. Sessions stall on faulty equipment. Vocal takes are recorded in "
            "rooms that let in traffic, generators and neighbours. Emerging producers learn by trial and "
            "error on equipment materially worse than the standard their work will be judged against. "
            "Talented people leave the sector not because they lack ability, but because the fixed cost of "
            "producing at a professional standard exceeds what they can carry alone.", S["body"])],
        [Paragraph(
            "Shared infrastructure resolves this in the same way it resolves it in other sectors: by "
            "separating the cost of the facility from the income of any one user. A single trained "
            "technician, one correctly isolated live room and one maintained console can serve hundreds of "
            "sessions a year. That is a different proposition from expecting each young producer to build a "
            "studio of their own.", S["body"]),
         Paragraph(
            "The proposal is therefore deliberately modest in what it asks for and deliberately specific in "
            "what it delivers. It does not propose a national recording industry from scratch. It proposes a "
            "working facility, with the acoustic treatment, equipment and instruction that professional "
            "output actually requires — and a route from that facility into paid work.", S["body"])]))

    st.append(Spacer(1, 16))

    parts = [
        ("01", "Space that is usable",
         "Floating floors, isolated walls and treated ceilings. A room in which a vocal can be recorded at "
         "any hour, in a city that is never quiet."),
        ("02", "Equipment that is working",
         "A console, monitoring, microphones, outboard and a maintained computer — with a technician and a "
         "maintenance budget, so that a session does not end on a broken cable."),
        ("03", "Instruction that is real",
         "Producer development, engineering practice, artist coaching and mixing sessions — taught in the "
         "same rooms used for commercial work, so that standards stay honest."),
    ]
    cells = []
    for n, h, p in parts:
        cells.append([Paragraph(n, ParagraphStyle("pi", fontName=F_DISPLAY, fontSize=7.6,
                                                  leading=10, textColor=GOLDLT)),
                      Paragraph(h, S["h4_light"]),
                      Paragraph(p, ParagraphStyle("pb", fontName=F_SANS, fontSize=7.9,
                                                  leading=11.8, textColor=HexColor("#B4C2CE")))])
    gap = 1.6
    colw = (CONTENT_W - gap * 2) / 3
    row_cells = [cells[0], "", cells[1], "", cells[2]]
    tt = Table([row_cells], colWidths=[colw, gap, colw, gap, colw])
    tt.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (0, 0), NAVY2),
        ("BACKGROUND", (2, 0), (2, 0), NAVY2),
        ("BACKGROUND", (4, 0), (4, 0), NAVY2),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (0, 0), 11),
        ("RIGHTPADDING", (0, 0), (0, 0), 11),
        ("LEFTPADDING", (2, 0), (2, 0), 11),
        ("RIGHTPADDING", (2, 0), (2, 0), 11),
        ("LEFTPADDING", (4, 0), (4, 0), 11),
        ("RIGHTPADDING", (4, 0), (4, 0), 11),
        ("TOPPADDING", (0, 0), (4, 0), 11),
        ("BOTTOMPADDING", (0, 0), (4, 0), 11),
    ]))
    st.append(KeepTogether([
        Paragraph("The problem, stated in three parts", S["h3"]),
        Spacer(1, 4),
        tt,
    ]))

    # ============ 6. Section 2 — mandate ============
    st.append(Spacer(1, 20))
    st.extend(section_head(
        "Section 2",
        "A shared facility for programmes <i>that already exist.</i>",
        "The Ministry does not need a new programme to make this work. It needs a production facility into "
        "which its existing beneficiaries can be directed."))

    st.append(Paragraph(
        "The Ministry of Gender, Labour and Social Development already funds skills, capital and social "
        "protection for the exact constituencies this facility would serve. What those programmes cannot "
        "supply is a shared place to produce. UCIC is proposed as that missing layer — a common-user "
        "facility, not a competing programme.", S["lede"]))

    mandate_rows = [
        ("Youth Livelihood Programme", "Young people aged 18–30, organised in groups",
         "Interest-free revolving funds, skills development and livelihood support",
         "A production facility where funded youth groups can record, train and trade"),
        ("Uganda Women Entrepreneurship Programme", "Women aged 18–65, in groups of 10–15",
         "Interest-free revolving credit and enterprise training",
         "Shared equipment and technical instruction that a group could not finance alone"),
        ("GROW project", "Women-led micro and small enterprises",
         "Support to grow enterprises, including common-user facilities",
         "A creative-sector common-user facility consistent with the GROW model"),
        ("Social Assistance Grants for Empowerment", "Vulnerable households and older persons",
         "Direct income support and referral into services",
         "An accessible route into creative work for household members"),
    ]
    st.extend(data_table(
        ["Instrument", "Who it reaches", "What it provides", "What UCIC adds"],
        mandate_rows,
        widths=[CONTENT_W * 0.215, CONTENT_W * 0.2, CONTENT_W * 0.265, CONTENT_W * 0.32],
        caption="Existing Ministry instruments and the gap a shared facility closes",
        first_col_bold=True))

    st.append(Spacer(1, 12))
    st.append(two_col(
        card([Kicker("Employment, not equipment", color=GOLD, rule_color=None),
              Spacer(1, 4),
              Paragraph("The outcome the Ministry is measured on.", S["h3"]),
              Paragraph("A console is not an outcome. A young person with a recorded catalogue, a booking, "
                        "an income and a tax record is an outcome. Every element of this proposal is "
                        "justified by its contribution to that end, and the measures in Section 6 are built "
                        "around it rather than around installation.", S["body"])],
             pad=12, accent=NAVY, accent_w=2),
        card([Kicker("Value created, not budget consumed", color=GOLD, rule_color=None),
              Spacer(1, 4),
              Paragraph("A facility designed to earn.", S["h3"]),
              Paragraph("The centre is structured to generate institutional income from commercial "
                        "bookings, training contracts and partnerships, which offsets the cost of free and "
                        "subsidised access. It is intended to be a producer of value for the sector, not a "
                        "recurring charge on the Ministry's vote.", S["body"])],
             pad=12, accent=NAVY, accent_w=2)))
    st.append(Spacer(1, 12))
    st.append(callout(
        "On inclusion",
        "The facility is proposed with physical accessibility, women's participation and youth employment "
        "as design requirements rather than aspirations. Access quotas, disaggregated reporting and an "
        "accessible building standard are set out in Sections 4 and 6."))

    # ============ 7. Section 3 — facility ============
    st.append(Spacer(1, 24))
    st.extend(section_head(
        "Section 3",
        "One building. <i>Four working rooms.</i>",
        "A single-storey U-plan building of approximately 1,000–1,200 m²: a production block, two teaching "
        "wings and an entrance block, arranged around a courtyard and covered colonnade."))

    st.append(figure("images/campus-exterior.jpg",
                     "Illustrative architectural concept — courtyard elevation. Not an approved design, and "
                     "not a depiction of any specific site. Final form is subject to premises assessment, "
                     "architectural design and approvals.",
                     label="Figure 2", aspect=16 / 7.4))

    st.append(Paragraph("Music spaces, by function", S["h3"]))

    rooms = [
        ("Studio A", "Live room",
         "Full band, drums, piano and strings. High ceilings, variable acoustics and clear sightlines to the "
         "control room.", "Area", "≈ 42 m²", "Provision", "Drum kit · piano · direct sightline"),
        ("Studio A", "Control room",
         "Large-format console, main and nearfield monitoring, outboard rack and a 24-track workflow.",
         "Area", "≈ 24 m²", "Provision", "Console · outboard · mixing and mastering"),
        ("Studio B", "Vocal booth",
         "Isolated booth for vocals, voice-over and podcasts. Bookable by the hour, with an engineer on hand.",
         "Area", "≈ 6 m²", "Provision", "Fully isolated · podcast-ready"),
        ("Programme", "Producer lab",
         "Beat-making and production stations where emerging producers learn on equipment better than what "
         "they have at home.", "Stations", "6 workstations", "Provision", "DAW · plugins · mentored sessions"),
    ]

    def room_card(r):
        tag, name, desc, d1, v1, d2, v2 = r
        spec = Table([
            [Paragraph(d1, ParagraphStyle("rd", fontName=F_BOLD, fontSize=6, leading=8.4,
                                          textColor=MUTED)),
             Paragraph(v1, ParagraphStyle("rv", fontName=F_SANS, fontSize=6.6, leading=9,
                                          textColor=NAVY, alignment=TA_RIGHT))],
            [Paragraph(d2, ParagraphStyle("rd2", fontName=F_BOLD, fontSize=6, leading=8.4,
                                          textColor=MUTED)),
             Paragraph(v2, ParagraphStyle("rv2", fontName=F_SANS, fontSize=6.6, leading=9,
                                          textColor=NAVY, alignment=TA_RIGHT))],
        ], colWidths=[24 * mm, None])
        spec.setStyle(TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1.6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1.6),
            ("LINEABOVE", (0, 0), (-1, 0), 0.5, RULELT),
        ]))
        return card([
            Paragraph(tag.upper(), ParagraphStyle("rt", fontName=F_BOLD, fontSize=6,
                                                   leading=8.4, textColor=GOLD)),
            Spacer(1, 2),
            Paragraph(name, S["h4"]),
            Paragraph(desc, ParagraphStyle("rdesc", fontName=F_SANS, fontSize=7.5,
                                           leading=11.4, textColor=BODY)),
            Spacer(1, 5), spec,
        ], pad=9, accent=GOLD, accent_w=2)

    row1 = [room_card(rooms[0]), "", room_card(rooms[1])]
    row2 = [room_card(rooms[2]), "", room_card(rooms[3])]

    def room_grid(cards):
        w = (CONTENT_W - 4 * mm) / 2
        fit_width(cards[0], w)
        fit_width(cards[2], w)
        t = Table([[cards[0], "", cards[2]]], colWidths=[w, 4 * mm, w])
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        return t

    st.append(room_grid(row1))
    st.append(Spacer(1, 4 * mm))
    st.append(room_grid(row2))

    st.append(Spacer(1, 10))
    st.append(two_col(
        figure("images/studio-vocal-booth.jpg",
               "Vocal booth, illustrative concept. Full acoustic isolation, with sightline to the control room.",
               label="Figure 3",
               width=(CONTENT_W - 6 * mm) / 2, aspect=16 / 10),
        figure("images/producer-lab.jpg",
               "Producer lab, illustrative concept. Six mentored workstations on a shared booking system.",
               label="Figure 4",
               width=(CONTENT_W - 6 * mm) / 2, aspect=16 / 10)))

    st.append(Spacer(1, 12))
    st.append(two_col(
        card([Kicker("Premises strategy", color=GOLD, rule_color=None), Spacer(1, 4),
              Paragraph("Assess before committing.", S["h3"]),
              Paragraph("Three routes will be compared before any property decision: an under-used "
                        "government or institutional building, a long-term lease of an existing commercial "
                        "building, and a public-private property partnership. No property route is assumed "
                        "in this document, and no site has been selected.", S["body"])],
             pad=12, accent=NAVY, accent_w=2),
        card([Kicker("Technical scope", color=GOLD, rule_color=None), Spacer(1, 4),
              Paragraph("Acoustics before equipment.", S["h3"]),
              Paragraph("The largest technical risk in a music facility is not the console; it is the room. "
                        "Acoustic engineering, isolation and treatment are therefore budgeted as a distinct "
                        "and protected line, and commissioned before equipment procurement, so that "
                        "installed equipment performs to specification.", S["body"])],
             pad=12, accent=NAVY, accent_w=2)))

    # ============ 8. Section 4 — programmes ============
    st.append(Spacer(1, 24))
    st.extend(section_head(
        "Section 4",
        "Music opens first. <i>Then the rest.</i>",
        "Music is the sector with the widest reach, the lowest entry barrier and the clearest path from "
        "ability to income. It is therefore Phase 1 and takes the largest single equipment allocation."))

    programmes = [
        ("01", "Music and sound production", "Phase 1",
         "Recording, production, mixing, mastering and artist development. Accessible professional rooms, "
         "equipment orientation, producer development, artist coaching, collaborative sessions and practical "
         "pathways into paid work."),
        ("02", "Film and digital media", None,
         "Video production, editing, sound for picture, digital storytelling and commercial content — added "
         "once the facility's operating model is proven."),
        ("03", "Photography and visual arts", None,
         "Shared photography facilities, lighting, visual communication, design practice, portfolio "
         "development and exhibition opportunities."),
        ("04", "Creative technology and innovation", None,
         "Creative software, music intelligence, intellectual property awareness, data tools, product "
         "testing and space for Ugandan technology innovators."),
        ("05", "Learning, performance and enterprise", None,
         "Practical training, mentorship, performance opportunities, business skills, market readiness, "
         "partnerships and pathways to sustainable creative enterprise."),
    ]
    prows = []
    for n, title, flag, desc in programmes:
        head_txt = title
        if flag:
            head_txt += ('&nbsp;&nbsp;<font name="%s" size="6" color="#0A1A2F" backColor="#D3B47A">'
                         '&nbsp;%s&nbsp;</font>' % (F_BOLD, flag.upper()))
        prows.append([
            Paragraph(n, ParagraphStyle("pn", fontName=F_DISPLAY_MED, fontSize=8.6,
                                        leading=12, textColor=GOLD)),
            [Paragraph(head_txt, S["h4"]), Paragraph(desc, S["body"])],
        ])
    pt = Table(prows, colWidths=[12 * mm, CONTENT_W - 12 * mm])
    pt.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULELT),
        ("LINEABOVE", (0, 0), (-1, 0), 0.6, RULE),
    ]))
    st.append(pt)

    st.append(Paragraph("Who the facility is for, and on what terms", S["h3"]))
    tiers = [
        ("Tier 1", "Free access",
         "Selected emerging artists, producers and engineers, and beneficiaries referred through Ministry "
         "programmes. Allocated by published criteria and a transparent selection panel."),
        ("Tier 2", "Subsidised access",
         "Registered creatives, students and non-profit projects, on a published rate card below commercial "
         "market rates."),
        ("Tier 3", "Commercial access",
         "Labels, agencies, corporate and broadcast clients at market rates. This income offsets Tier 1 and "
         "Tier 2 access."),
    ]
    tcells = []
    for tier, name, desc in tiers:
        tcells.append(card([
            Paragraph(tier.upper(), ParagraphStyle("tt2", fontName=F_BOLD, fontSize=6,
                                                    leading=8.4, textColor=GOLD)),
            Spacer(1, 3),
            Paragraph(name, S["h4"]),
            Paragraph(desc, ParagraphStyle("td", fontName=F_SANS, fontSize=7.6,
                                           leading=11.5, textColor=BODY)),
        ], pad=10, accent=NAVY, accent_w=0))
    tw = (CONTENT_W - 8 * mm) / 3
    for c in tcells:
        fit_width(c, tw)
    tiers_tbl = Table([[tcells[0], "", tcells[1], "", tcells[2]]],
                      colWidths=[tw, 4 * mm, tw, 4 * mm, tw])
    tiers_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    st.append(tiers_tbl)

    st.append(Spacer(1, 12))
    st.append(callout(
        "Why free access is a design requirement, not a subsidy",
        "The beneficiaries this facility exists to reach cannot pay commercial rates, and will not be "
        "reached if the facility must recover all its costs from them. Free and subsidised tiers are "
        "therefore written into the operating model, funded by a defined mix of grant support, partnership "
        "contribution and commercial booking income — with the ratio reported annually."))

    # ============ 9. Section 5 — investment ============
    st.append(Spacer(1, 24))
    st.extend(section_head(
        "Section 5",
        "A UGX 3.0 billion <i>establishment framework.</i>",
        "An indicative planning envelope for fitting out and launching the centre in an existing building. "
        "It is not a land purchase, a new-build estimate or a fully funded operating budget."))

    left_inv = [
        Paragraph("TOTAL INDICATIVE ESTABLISHMENT INVESTMENT",
                  ParagraphStyle("il", fontName=F_BOLD, fontSize=6.6, leading=9, textColor=MUTED)),
        Spacer(1, 5),
        Paragraph('UGX 3.0<font size="17" color="#B08D4F">&nbsp;bn</font>',
                  ParagraphStyle("it", fontName=F_DISPLAY_MED, fontSize=42, leading=44,
                                 textColor=NAVY)),
        Spacer(1, 4),
        Paragraph("Preliminary planning estimate, subject to feasibility, bill of quantities and supplier "
                  "quotations.", S["small"]),
        Spacer(1, 9),
    ]
    brk = [
        ("Music-specific allocation", "UGX 650m"),
        ("Acoustics, isolation and treatment", "UGX 300m"),
        ("Building renovation and infrastructure", "UGX 500m"),
        ("Contingency provision", "UGX 200m"),
    ]
    bt = Table([[Paragraph(a, S["cell"]), Paragraph(b, S["cell_num"])] for a, b in brk],
               colWidths=[None, 26 * mm])
    bt.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULELT),
        ("LINEABOVE", (0, 0), (-1, 0), 0.6, RULE),
    ]))
    left_inv.append(bt)

    # bar chart
    maxv = max(b[1] for b in BUDGET)
    short = {
        "Feasibility, legal, architectural & engineering": "Feasibility &amp; legal",
        "Property deposit, lease preparation & initial occupancy": "Property &amp; occupancy",
        "Building renovation & infrastructure": "Renovation &amp; infrastructure",
        "Acoustic engineering & treatment": "Acoustics &amp; treatment",
        "Music production equipment": "Music equipment",
        "Film, photography & digital media equipment": "Film &amp; photo equipment",
        "Computers, software, networking & storage": "Computers &amp; software",
        "Electrical systems & backup power": "Electrical &amp; backup power",
        "Furniture & shared facilities": "Furniture &amp; facilities",
        "Safety, security & accessibility": "Safety &amp; accessibility",
        "Recruitment & staff training": "Recruitment &amp; training",
        "Launch & outreach": "Launch &amp; outreach",
        "Initial operating reserve": "Operating reserve",
        "Contingency": "Contingency",
    }
    chart_w = (CONTENT_W - 8 * mm) * 0.54
    short = {
        "Feasibility, legal, architectural & engineering": "Feasibility and legal",
        "Property deposit, lease preparation & initial occupancy": "Property and occupancy",
        "Building renovation & infrastructure": "Renovation and infrastructure",
        "Acoustic engineering & treatment": "Acoustics and treatment",
        "Music production equipment": "Music equipment",
        "Film, photography & digital media equipment": "Film and photo equipment",
        "Computers, software, networking & storage": "Computers and software",
        "Electrical systems & backup power": "Electrical and backup power",
        "Furniture & shared facilities": "Furniture and facilities",
        "Safety, security & accessibility": "Safety and accessibility",
        "Recruitment & staff training": "Recruitment and training",
        "Launch & outreach": "Launch and outreach",
        "Initial operating reserve": "Operating reserve",
        "Contingency": "Contingency",
    }
    chart_rows = [(short.get(n, n), a) for n, a, _ in BUDGET]
    bar_chart = BarChart(chart_rows, chart_w, max(b[1] for b in BUDGET))

    right_inv = [Kicker("Allocation by budget line", color=GOLD, rule_color=None),
                 Spacer(1, 9), bar_chart]

    st.append(two_col(left_inv, right_inv, widths=((CONTENT_W - 8 * mm) * 0.46,
                                                   (CONTENT_W - 8 * mm) * 0.54)))

    st.append(Spacer(1, 13))
    st.append(callout(
        "What this estimate excludes",
        "Land purchase; new construction; financing costs; and a multi-year operating budget, which is "
        "addressed separately in the operating model. The estimate assumes an existing suitable building at "
        "a cost of occupancy to be confirmed during the premises assessment."))

    st.append(Spacer(1, 12))
    st.append(two_col(
        card([Kicker("Funding approach", color=GOLD, rule_color=None), Spacer(1, 4),
              Paragraph("Mobilise in stages.", S["h3"]),
              Paragraph("Public support, private-sector contribution, development partners, equipment "
                        "sponsorship and programme partnership are combined in sequence, with each stage "
                        "releasing the next. The Minister is asked to champion and facilitate the project, "
                        "not to finance it personally or from a single vote.", S["body"])],
             pad=12, accent=NAVY, accent_w=2),
        card([Kicker("Procurement", color=GOLD, rule_color=None), Spacer(1, 4),
              Paragraph("Nothing committed before it is costed.", S["h3"]),
              Paragraph("No supplier, contractor or technology partner is selected by this document. All "
                        "procurement would follow applicable public procurement rules, on the basis of a "
                        "technical specification, a bill of quantities and competitive quotation or "
                        "tender.", S["body"])],
             pad=12, accent=NAVY, accent_w=2)))

    brows = [[str(i + 1).zfill(2), n, s, ugx(a), pct(a)]
             for i, (n, a, s) in enumerate(BUDGET)]
    st.append(Spacer(1, 14))
    st.extend(data_table(
        ["Stage", "Period", "Covers", "Amount", "Share"],
        [
            ("Stage 1 · Development", "0–3 months",
             "Feasibility, legal structuring, concept design, cost verification",
             "UGX 150m", "5.0%"),
            ("Stage 2 · Establishment", "4–12 months",
             "Premises, renovation, acoustics, equipment, systems, furniture, safety, core team",
             "UGX 2,270m", "75.7%"),
            ("Stage 3 · Launch and stabilise", "9–24 months",
             "Launch and outreach, initial operating reserve, contingency",
             "UGX 580m", "19.3%"),
        ],
        widths=[CONTENT_W * 0.24, CONTENT_W * 0.13, CONTENT_W * 0.39, 24 * mm, 16 * mm],
        total_row=["Total", "", "", "UGX 3,000m", "100.0%"],
        caption="Indicative funding sequence — how the envelope releases in stages"))

    # The schedule is fourteen rows plus a total: give it its own page so it is
    # never split across a break.
    st.append(PageBreak())
    st.extend(section_head(
        "Section 5, continued",
        "Indicative budget schedule",
        "Fourteen budget lines totalling UGX 3.0 billion. Figures are indicative planning estimates and "
        "require validation through feasibility, a bill of quantities and supplier quotation."))
    st.append(Spacer(1, 4))
    st.extend(data_table(
        ["#", "Budget line", "Scope", "Amount", "Share"],
        brows,
        widths=[11 * mm, CONTENT_W * 0.28, CONTENT_W * 0.415, 26 * mm, 16 * mm],
        total_row=["", "Total indicative establishment investment", "", "UGX 3,000m", "100.0%"],
        caption="Indicative establishment budget — fourteen lines, UGX millions"))



    # ============ 10. Section 6 — governance ============
    st.append(PageBreak())
    st.extend(section_head(
        "Section 6",
        "Trust is part of <i>the infrastructure.</i>",
        "A public facility holding public and partner resources must be auditable from the first cedi. "
        "These safeguards are proposed as conditions of establishment, not as later additions.", dark=True))

    safeguards = [
        "A defined public-private ownership and partnership structure, settled with legal advice before establishment.",
        "An independent board or oversight mechanism, with published conflict-of-interest rules and a register of interests.",
        "Professional centre management, appointed on merit, with published service standards and performance targets.",
        "Annual audited financial reporting, procurement controls and independent performance review.",
        "Transparent beneficiary selection, booking and complaints processes, with reasons given for decisions.",
        "Public disclosure of access statistics, subsidy ratios and commercial income alongside audited accounts.",
    ]
    measures = [
        "Creatives trained and supported, disaggregated by age, sex, disability and region.",
        "Hours of free and subsidised facility access delivered, against target.",
        "Creative works produced, released and commercially exploited.",
        "Jobs, internships, enterprises and paid opportunities supported, with evidence of income.",
        "Partnerships formed, intellectual property awareness delivered and technology adoption achieved.",
        "Cost per beneficiary and cost per access hour, published annually for comparison.",
    ]
    half = (CONTENT_W - 8 * mm) / 2
    left_g = [Paragraph("Proposed safeguards", S["h3"]),
              numbered(safeguards, style_body=S["body"], num_w=12 * mm)]
    right_g = [Paragraph("What we will report", S["h3"]),
               bullet_list(measures, style_body=S["body"])]
    st.append(two_col(left_g, right_g, gap=8 * mm, widths=(half, half)))

    st.append(Spacer(1, 14))
    st.append(callout(
        "Traceability",
        "Every shilling spent is intended to be traceable to a budget line, a procurement record and a "
        "delivered asset, and every asset to a maintained register. Where public money is spent, it should "
        "be possible to show what was bought, what it cost, who is responsible for it and what it produced.",
        dark=True))

    # ============ 11. Section 7 — roadmap ============
    st.append(PageBreak())
    s7 = section_head(
        "Section 7",
        "Build carefully. <i>Prove value. Scale.</i>",
        "A phased sequence reduces risk, tests demand and allows the centre to open with a credible first "
        "set of services before later programmes are committed.")

    phases = [
        ("Phase 01 · 0–3 months", "Validate",
         "Stakeholder consultation, feasibility, premises assessment, governance design, technical brief "
         "and independent cost verification."),
        ("Phase 02 · 4–8 months", "Establish",
         "Secure premises, complete design and fit-out, procure priority music equipment, recruit and train "
         "the core technical team."),
        ("Phase 03 · 9–12 months", "Launch music-first",
         "Open the priority studios and learning programmes, introduce fair booking, publish service "
         "standards and establish baseline metrics."),
        ("Phase 04 · 12–24 months", "Expand",
         "Extend into film, photography, creative technology and enterprise as resources, demand and "
         "operating performance justify."),
    ]
    ph_w = CONTENT_W / 4
    ph_cells = []
    for label, name, desc in phases:
        ph_cells.append([
            Paragraph(label.upper(), ParagraphStyle("pl", fontName=F_BOLD, fontSize=6,
                                                     leading=8.4, textColor=GOLD)),
            Spacer(1, 3),
            Paragraph(name, S["h4"]),
            Paragraph(desc, ParagraphStyle("pd", fontName=F_SANS, fontSize=7.2,
                                           leading=10.8, textColor=BODY)),
        ])
    ph_tbl = Table([ph_cells], colWidths=[ph_w] * 4)
    ph_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("LEFTPADDING", (1, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-2, -1), 9),
        ("RIGHTPADDING", (3, 0), (3, 0), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEABOVE", (0, 0), (-1, 0), 1.4, NAVY),
        ("LINEBEFORE", (1, 0), (-1, -1), 0.4, RULELT),
    ]))
    st.append(KeepTogether(s7 + [ph_tbl]))

    # ============ 12. Section 8 — next steps ============
    st.append(Spacer(1, 22))
    st.extend(section_head(
        "Section 8",
        "Decisions <i>requested.</i>",
        "The proposal seeks guidance and facilitation to move from concept to a properly assessed, "
        "partner-backed implementation plan.", dark=True))

    requests = [
        "Consider the UCIC concept and provide strategic guidance on its alignment with Ministry priorities.",
        "Facilitate coordination with relevant ministries, agencies, public institutions and training partners.",
        "Support the identification and assessment of suitable government or institutional premises in Kampala.",
        "Endorse the mobilisation of resources for an independent feasibility and technical assessment.",
        "Convene private-sector, development, technology and creative-industry partners.",
        "Consider serving as patron or strategic champion of the initiative, subject to your acceptance.",
    ]
    req_rows = []
    for i, r in enumerate(requests, start=1):
        req_rows.append([
            Paragraph(str(i).zfill(2), ParagraphStyle("rn", fontName=F_DISPLAY_MED, fontSize=8,
                                                       leading=13, textColor=GOLDLT)),
            Paragraph(r, ParagraphStyle("rt3", fontName=F_SANS, fontSize=8.4,
                                        leading=13, textColor=HexColor("#C6D3DD"))),
        ])
    req_tbl = Table(req_rows, colWidths=[10 * mm, None])
    req_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), NAVY2),
        ("LEFTPADDING", (0, 0), (0, -1), 10),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, HexColor("#2E4256")),
    ]))

    decision = card([
        Badge("For ministerial consideration"),
        Spacer(1, 8),
        Kicker("The immediate next step", color=GOLD, rule_color=None),
        Spacer(1, 3),
        Paragraph("Authorise a 90-day development phase.", S["h3"]),
        Paragraph("Constitute a small multi-stakeholder working group to validate the concept, confirm "
                  "premises options, commission technical costing, refine governance and prepare an "
                  "investment-ready implementation case for the Ministry's decision.", S["body"]),
        Spacer(1, 4),
        Table([
            [Paragraph("DURATION", ParagraphStyle("dm", fontName=F_BOLD, fontSize=5.8,
                                                  leading=8, textColor=MUTED)),
             Paragraph("90 days", ParagraphStyle("dv", fontName=F_SANS, fontSize=7.2,
                                                  leading=10, textColor=NAVY))],
            [Paragraph("OUTPUT", ParagraphStyle("dm2", fontName=F_BOLD, fontSize=5.8,
                                                leading=8, textColor=MUTED)),
             Paragraph("Investment-ready implementation case",
                       ParagraphStyle("dv2", fontName=F_SANS, fontSize=7.2,
                                      leading=10, textColor=NAVY))],
            [Paragraph("COST TO MINISTRY", ParagraphStyle("dm3", fontName=F_BOLD, fontSize=5.8,
                                                          leading=8, textColor=MUTED)),
             Paragraph("No financial commitment requested at this stage",
                       ParagraphStyle("dv3", fontName=F_SANS, fontSize=7.2,
                                      leading=10, textColor=NAVY))],
        ], colWidths=[27 * mm, None], style=TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LINEABOVE", (0, 0), (-1, 0), 0.5, RULELT),
            ("LINEBELOW", (0, -1), (-1, -1), 0.5, RULELT),
        ])),
        Spacer(1, 6),
        Paragraph("Submitted for consideration by<br/><b>Hon. Lt. Gen. (Rtd) Henry Tumukunde</b><br/>"
                  "Minister of Gender, Labour and Social Development", S["small"]),
    ], pad=12, accent=GOLD, accent_w=3)

    st.append(two_col(req_tbl, decision, gap=7 * mm,
                      widths=((CONTENT_W - 7 * mm) * 0.52, (CONTENT_W - 7 * mm) * 0.48)))

    # ============ 13. Annexes ============
    st.append(PageBreak())
    st.extend(section_head(
        "Annexes",
        "Assumptions, schedule and <i>definitions.</i>"))

    st.append(Paragraph("Annex A · Assumptions and limitations", S["h3"]))
    st.append(bullet_list([
        "All costs are indicative planning figures in Uganda Shillings, at November 2026 price levels, and "
        "are not quotations.",
        "The framework assumes an existing suitable building. Land purchase and new construction are excluded.",
        "No site, landlord, supplier, contractor or technology partner has been selected or engaged.",
        "Facility areas and room counts are conceptual and subject to architectural design and measured survey.",
        "Images in this document are illustrative renderings, not approved designs or photographs of "
        "existing premises.",
        "Programme figures cited for Ministry instruments are summarised from published sources and should "
        "be verified against current Ministry records.",
        "Establishment figures require validation through feasibility study, bill of quantities and "
        "competitive quotation.",
    ]))

    st.append(Paragraph("Annex B · Budget schedule", S["h3"]))
    abrows = [[str(i + 1).zfill(2), n, s, ugx(a), pct(a)]
              for i, (n, a, s) in enumerate(BUDGET)]
    st.extend(data_table(
        ["#", "Budget line", "Scope", "Amount", "Share"],
        abrows,
        widths=[11 * mm, CONTENT_W * 0.28, CONTENT_W * 0.415, 26 * mm, 16 * mm],
        total_row=["", "Total indicative establishment investment", "", "UGX 3,000m", "100.0%"],
        caption="Annex B — full establishment schedule, fourteen budget lines, UGX millions"))

    st.append(Paragraph("Annex C · Definitions", S["h3"]))
    glossary = [
        ("Common-user facility",
         "A shared facility, typically publicly or partnership-owned, that provides equipment and services "
         "to many users who could not each afford to own it."),
        ("Establishment investment",
         "One-off capital required to make the facility operational: premises works, acoustics, equipment, "
         "systems and launch costs."),
        ("Operating model",
         "The recurring arrangement by which the facility is staffed, maintained and funded once open — "
         "treated separately from establishment."),
        ("Free access",
         "Use of the facility at no charge to the beneficiary, allocated by published criteria and recorded "
         "against a defined annual allocation."),
        ("Subsidy ratio",
         "The proportion of total facility access delivered at free or below-market rates, reported annually "
         "against the commercial income that offsets it."),
    ]
    grows = [[Paragraph(a, S["cellb"]), Paragraph(b, S["cell"])] for a, b in glossary]
    gt = Table(grows, colWidths=[42 * mm, CONTENT_W - 42 * mm])
    gt.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEABOVE", (0, 0), (-1, 0), 0.6, RULE),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULELT),
    ]))
    st.append(gt)

    st.append(Spacer(1, 14))
    st.append(Table([[Paragraph(
        "A proposal submitted for the consideration of the Ministry of Gender, Labour and Social "
        "Development. All figures are preliminary; all images are illustrative concepts and not approved "
        "designs. Version 1.0 · November 2026 · Kampala, Uganda",
        ParagraphStyle("fin", fontName=F_SANS, fontSize=7, leading=10.6, textColor=MUTED))]],
        colWidths=[CONTENT_W], style=TableStyle([
            ("LINEABOVE", (0, 0), (-1, 0), 0.6, RULE),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ])))
    return st


def main():
    register_fonts()
    doc = BaseDocTemplate(
        OUT, pagesize=A4,
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=MARGIN_T, bottomMargin=MARGIN_B,
        title="Uganda Creative Innovation Centre — Proposal to the Minister of Gender, Labour and Social Development",
        author="Uganda Creative Innovation Centre",
        subject="A national facility for music and creative work — UGX 3.0bn establishment framework",
        creator="UCIC document build",
    )
    frame_cover = Frame(MARGIN_L, MARGIN_B, CONTENT_W, A4[1] - MARGIN_T - MARGIN_B,
                        id="cover", leftPadding=0, rightPadding=0,
                        topPadding=0, bottomPadding=0)
    frame_body = Frame(MARGIN_L, MARGIN_B, CONTENT_W, A4[1] - MARGIN_T - MARGIN_B,
                       id="body", leftPadding=0, rightPadding=0,
                       topPadding=0, bottomPadding=0)
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[frame_cover], onPage=draw_cover),
        PageTemplate(id="body", frames=[frame_body], onPage=draw_footer),
    ])
    story = [NextPageTemplate("body"), Spacer(1, 1)] + build_story()
    doc.build(story)
    size = os.path.getsize(OUT)
    print(f"Wrote {OUT} ({size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
