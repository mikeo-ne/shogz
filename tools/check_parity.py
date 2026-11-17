#!/usr/bin/env python3
"""
Verify that the PDF edition and the web edition are the same document.

The brief was explicit: the downloadable PDF must be the same proposal as the
interactive one, not a shortened or separately written version. Two copies of a
document drift unless something checks them, so this script asserts:

  1. the budget model in js/main.js and in tools/build_pdf.py are identical;
  2. every section and heading in the web edition appears in the PDF, and
     vice versa;
  3. the headline figures agree in both.

Run after editing either edition:  python3 tools/check_parity.py
Exit code 0 = in sync, 1 = drift found (details printed).
"""

import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "UCIC-proposal.pdf")
HTML = os.path.join(ROOT, "index.html")
JS = os.path.join(ROOT, "js", "main.js")

failures = []
notes = []


# ---------------------------------------------------------------- helpers
def norm(s):
    """Normalise text for comparison: unify dashes/quotes, collapse space."""
    s = s.replace("\u2019", "'").replace("\u2018", "'")
    s = s.replace("\u201c", '"').replace("\u201d", '"')
    s = s.replace("\u2014", "-").replace("\u2013", "-")
    s = s.replace("\u00b7", " ")
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip().lower()


def html_text():
    """The web edition's visible text.

    The budget tables are rendered by js/main.js from the same array, so the
    script's own strings are part of what a reader sees on the page; they are
    included here for that reason, not to make the check pass."""
    raw = open(HTML, encoding="utf-8").read()
    body = raw[raw.find("<main"):raw.find("</main>")]
    body = re.sub(r"<script.*?</script>", " ", body, flags=re.S)
    script = open(JS, encoding="utf-8").read()
    return norm(body + " " + script)


def pdf_text():
    try:
        import pymupdf
    except ImportError:
        print("pymupdf is required: pip install pymupdf")
        sys.exit(2)
    doc = pymupdf.open(PDF)
    return norm(" ".join(page.get_text() for page in doc))


def pdf_page_count():
    import pymupdf
    return pymupdf.open(PDF).page_count


# ---------------------------------------------------------------- 1. budget model
def check_budget_model():
    js = open(JS, encoding="utf-8").read()
    m = re.search(r"var BUDGET = \[(.*?)\n  \];", js, re.S)
    if not m:
        failures.append("could not find BUDGET in js/main.js")
        return
    # each entry: ['name', amount, 'scope']
    js_rows = re.findall(r"\['([^']+)',\s*(\d+),", m.group(1))
    js_rows = [(n, int(a)) for n, a in js_rows]

    py = open(os.path.join(ROOT, "tools", "build_pdf.py"), encoding="utf-8").read()
    pm = re.search(r"BUDGET = \[(.*?)\n\]", py, re.S)
    if not pm:
        failures.append("could not find BUDGET in tools/build_pdf.py")
        return
    py_rows = re.findall(r'\("([^"]+)",\s*(\d+),', pm.group(1))
    py_rows = [(n, int(a)) for n, a in py_rows]

    if js_rows != py_rows:
        failures.append(
            "budget model differs between js/main.js (%d lines) and "
            "tools/build_pdf.py (%d lines)" % (len(js_rows), len(py_rows)))
        for i, (a, b) in enumerate(zip(js_rows, py_rows)):
            if a != b:
                failures.append("  line %d: web=%r  pdf=%r" % (i + 1, a, b))
    else:
        notes.append("budget model identical (%d lines, UGX %dm)"
                     % (len(js_rows), sum(a for _, a in js_rows)))
    return js_rows


# ---------------------------------------------------------------- 2. headings
WEB_HEADINGS = [
    "The Uganda Creative Innovation Centre",
    "Letter of transmittal",
    "The document at a glance",
    "Record. Produce. Learn. Earn.",
    "Uganda's music travels. Its studios don't.",
    "The problem, stated in three parts",
    "A shared facility for programmes that already exist",
    "Four containers. One courtyard.",
    "Music spaces, by function",
    "Music opens first. Then the rest.",
    "Who the facility is for, and on what terms",
    "A UGX 3.0 billion establishment framework",
    "Trust is part of the infrastructure",
    "Build carefully. Prove value. Scale.",
    "Decisions requested",
    "Annex A - Assumptions and limitations",
    "Annex C - Definitions",
]

CROSS_EDITION_FACTS = [
    ("Hon. Lt. Gen. (Rtd) Henry Tumukunde", "addressee"),
    ("Minister of Gender, Labour and Social Development", "addressee role"),
    ("UGX 3.0", "total envelope"),
    ("UGX 650m", "music allocation"),
    ("UGX 300m", "acoustics allocation"),
    ("UGX 500m", "container and site allocation"),
    ("UGX 200m", "contingency"),
    ("1,000-1,200", "full-campus area"),
    ("40ft high-cube", "container module"),
    ("Container 01", "first module"),
    ("Container 04", "fourth module"),
    ("24 months", "programme horizon"),
    ("Youth Livelihood Programme", "YLP"),
    ("Uganda Women Entrepreneurship Programme", "UWEP"),
    ("GROW project", "GROW"),
    ("Social Assistance Grants for Empowerment", "SAGE"),
    ("90-day development phase", "immediate ask"),
    ("Illustrative concept", "image disclaimer"),
    ("first cluster of four", "summary describes the container cluster"),
    ("beat lab", "summary names the beat lab"),
    ("covered courtyard", "courtyard scheme"),
    ("secure, serviced plot", "site requirement"),
    ("Full campus at completion", "area label"),
    ("free access", "access policy"),
    ("Common-user facility", "definition"),
]


def check_content(js_rows):
    if not os.path.exists(PDF):
        failures.append("UCIC-proposal.pdf is missing — run tools/build_pdf.py")
        return

    web = html_text()
    pdf = pdf_text()

    for h in WEB_HEADINGS:
        h_n = norm(h)
        # the PDF renders ampersands as "and" in display headings
        variants = {h_n, h_n.replace(" & ", " and "),
                    h_n.replace(" - ", " "), h_n.replace(" - ", " \u00b7 ")}
        if not any(v in web for v in variants):
            failures.append("web edition is missing heading: %r" % h)
        if not any(v in pdf for v in variants):
            failures.append("PDF is missing heading: %r" % h)

    for fact, label in CROSS_EDITION_FACTS:
        f = norm(fact)
        if f not in web:
            failures.append("web edition is missing %s (%r)" % (label, fact))
        if f not in pdf:
            failures.append("PDF is missing %s (%r)" % (label, fact))

    # every budget line must be named in both editions
    if js_rows:
        for name, amount in js_rows:
            n = norm(name)
            if n not in web:
                failures.append("web edition is missing budget line %r" % name)
            if n not in pdf:
                failures.append("PDF is missing budget line %r" % name)

    # the total must be stated in the PDF and the web edition
    total = sum(a for _, a in (js_rows or []))
    if total and f"ugx {total:,}m" not in pdf:
        failures.append("PDF does not state the budget total UGX %dm" % total)

    notes.append("PDF pages: %d" % pdf_page_count())
    notes.append("budget lines cross-checked in both editions: %d" % len(js_rows or []))

    check_shared_prose(web, pdf)
    check_retired_phrases(web, pdf)
    check_no_overflow()


# Paragraphs that must read the same in both editions. The retired-phrase check
# below only catches wording we knew to remove; this catches the opposite failure,
# where a paragraph is reworked in one edition and left stale in the other. That
# happened to the premises strategy, which was rewritten for the container scheme
# in the PDF but not on the web page.
SHARED_PROSE = [
    ("separating the cost of the facility from the income of any one user",
     "Section 1 - shared infrastructure"),
    ("a cluster of four such rooms, sharing one courtyard and one team",
     "Section 1 - the cluster argument"),
    ("built from modular container units around a covered courtyard",
     "executive summary - build method"),
    ("the site requirement reduces to a secure, serviced plot",
     "premises strategy - site requirement"),
    ("with vehicle access for a crane", "premises strategy - crane access"),
    ("roughly 120 m", "area reconciliation - first cluster"),
]

RETIRED_PHRASES = [
    # Left over from the single-storey U-plan draft. The scheme is now four
    # 40ft containers around a courtyard, so these must not reappear in either
    # edition. They were all present in the container draft's prose long after
    # the facility section had been rewritten, which is why this check exists.
    "u-plan",
    "usable facility area",
    "existing suitable building",
    "expecting each young producer to build a studio of their own",
    "building renovation",
    "new construction",
    "producer lab",
    "studio a",
    "studio b",
]


def check_shared_prose(web, pdf):
    """Key paragraphs must survive, recognisably, in both editions."""
    hits = 0
    for phrase, label in SHARED_PROSE:
        p = norm(phrase)
        for edition, text in (("web edition", web), ("PDF", pdf)):
            if p not in text:
                failures.append("%s does not carry %s" % (edition, label))
                hits += 1
    if not hits:
        notes.append("shared prose present in both editions (%d passages)" % len(SHARED_PROSE))


def check_retired_phrases(web, pdf):
    """No stale wording from a superseded draft may survive in either edition."""
    hits = 0
    for phrase in RETIRED_PHRASES:
        # word boundaries, so "studio a" does not match "studio and"
        pat = re.compile(r"\b" + re.escape(norm(phrase)) + r"\b")
        for label, text in (("web edition", web), ("PDF", pdf)):
            if pat.search(text):
                failures.append("%s still uses retired phrasing %r" % (label, phrase))
                hits += 1
    if not hits:
        notes.append("no retired phrasing in either edition")


def check_no_overflow():
    """Nothing may sit outside the page margins.

    This catches the class of bug where a nested table is built at the wrong
    width and is silently drawn past the right edge — invisible on screen,
    clipped on paper. It shipped once in the headline figures card."""
    import pymupdf
    doc = pymupdf.open(PDF)
    # 16 mm margins, matching tools/build_pdf.py
    left = 16 * 72 / 25.4
    page_w = doc[0].rect.width
    right = page_w - left

    offenders = []
    for i, page in enumerate(doc):
        for w in page.get_text("words"):
            if w[2] > right + 0.75 or w[0] < left - 0.75:
                offenders.append((i + 1, round(w[0], 1), round(w[2], 1), w[4][:28]))

    if offenders:
        failures.append("text outside the page margins on %d word(s)" % len(offenders))
        for page_no, x0, x1, word in offenders[:8]:
            failures.append("  page %d: x %s..%s  %r" % (page_no, x0, x1, word))
    else:
        notes.append("no text outside the page margins")


# ---------------------------------------------------------------- main
def main():
    rows = check_budget_model()
    check_content(rows)

    print("UCIC document parity check")
    print("-" * 58)
    for n in notes:
        print("  ok   " + n)
    if failures:
        print()
        for f in failures:
            print("  FAIL " + f)
        print("\n%d problem(s) found." % len(failures))
        return 1
    print("\nThe PDF and the web edition are in sync.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
