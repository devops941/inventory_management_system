#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build the final-year project report .docx from the markdown chapter files.

Styling: A4, Times New Roman 12pt body, 1.5 line spacing, justified,
margins left 1.5" / others 1". Chapter headings 16pt bold, sections 14pt bold,
subsections 12pt bold. Roman page numbers for front matter, Arabic for the body.
Auto-updating Table of Contents, List of Figures and List of Tables fields.
"""
import re
import os
from docx import Document
from docx.shared import Pt, Inches, Mm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CH = os.path.join(ROOT, "docs", "chapters")
OUT = os.path.join(ROOT, "Inventory_Management_System_Project_Report.docx")

BODY_FONT = "Times New Roman"
CODE_FONT = "Consolas"
ACCENT = RGBColor(0x1F, 0x2A, 0x44)      # deep navy for headings
CODE_SHADE = "F3F4F6"
HEADER_SHADE = "E8EBF3"

CAP_RE = re.compile(r'^\*{0,2}(Figure|Table)\s+[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)?\s*:', re.I)
INLINE_RE = re.compile(r'(\*\*.+?\*\*|`[^`]+`|\*[^*]+\*)')


# --------------------------------------------------------------------------- #
#  Low-level XML helpers
# --------------------------------------------------------------------------- #
def _set_shading(element, fill):
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill)
    element.append(shd)


def shade_cell(cell, fill):
    _set_shading(cell._tc.get_or_add_tcPr(), fill)


def add_field(paragraph, instr, placeholder="Update this field in Word (Ctrl+A, then F9)."):
    """Insert a complex Word field (begin / instrText / separate / end)."""
    run = paragraph.add_run()
    b = OxmlElement('w:fldChar'); b.set(qn('w:fldCharType'), 'begin')
    run._r.append(b)
    run2 = paragraph.add_run()
    it = OxmlElement('w:instrText'); it.set(qn('xml:space'), 'preserve'); it.text = instr
    run2._r.append(it)
    run3 = paragraph.add_run()
    sep = OxmlElement('w:fldChar'); sep.set(qn('w:fldCharType'), 'separate')
    run3._r.append(sep)
    run4 = paragraph.add_run(placeholder)
    run5 = paragraph.add_run()
    e = OxmlElement('w:fldChar'); e.set(qn('w:fldCharType'), 'end')
    run5._r.append(e)


def set_page_numbering(section, fmt, start=None):
    sectPr = section._sectPr
    pgNum = sectPr.find(qn('w:pgNumType'))
    if pgNum is None:
        pgNum = OxmlElement('w:pgNumType')
        sectPr.append(pgNum)
    pgNum.set(qn('w:fmt'), fmt)
    if start is not None:
        pgNum.set(qn('w:start'), str(start))


def footer_page_number(section, prefix="Page "):
    section.footer.is_linked_to_previous = False
    p = section.footer.paragraphs[0]
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if prefix:
        p.add_run(prefix)
    add_field(p, "PAGE", placeholder="1")
    for r in p.runs:
        r.font.name = BODY_FONT
        r.font.size = Pt(10)


def header_text(section, text):
    section.header.is_linked_to_previous = False
    p = section.header.paragraphs[0]
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.font.name = BODY_FONT
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    run.italic = True


# --------------------------------------------------------------------------- #
#  Styles
# --------------------------------------------------------------------------- #
def build_styles(doc):
    styles = doc.styles

    normal = styles['Normal']
    normal.font.name = BODY_FONT
    normal.font.size = Pt(12)
    normal.element.rPr.rFonts.set(qn('w:eastAsia'), BODY_FONT)
    pf = normal.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf.space_after = Pt(6)
    pf.space_before = Pt(0)

    def restyle_heading(name, size, color=ACCENT, before=14, after=8,
                        align=WD_ALIGN_PARAGRAPH.LEFT, page_break=False,
                        italic=False):
        st = styles[name]
        st.font.name = BODY_FONT
        st.font.size = Pt(size)
        st.font.bold = True
        st.font.italic = italic
        st.font.color.rgb = color
        p = st.paragraph_format
        p.space_before = Pt(before)
        p.space_after = Pt(after)
        p.keep_with_next = True
        p.alignment = align
        p.page_break_before = page_break
        p.line_spacing_rule = WD_LINE_SPACING.SINGLE

    restyle_heading('Heading 1', 16, align=WD_ALIGN_PARAGRAPH.CENTER,
                    page_break=True, before=0, after=16)
    restyle_heading('Heading 2', 14, before=16, after=6)
    restyle_heading('Heading 3', 12.5, before=12, after=4)
    restyle_heading('Heading 4', 12, before=10, after=2, italic=True)

    def new_style(name, base='Normal'):
        if name in [s.name for s in styles]:
            return styles[name]
        return styles.add_style(name, 1)  # 1 = paragraph

    fh = new_style('FrontHeading')
    fh.base_style = styles['Normal']
    fh.font.name = BODY_FONT
    fh.font.size = Pt(16)
    fh.font.bold = True
    fh.font.color.rgb = ACCENT
    fh.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fh.paragraph_format.space_before = Pt(0)
    fh.paragraph_format.space_after = Pt(16)
    fh.paragraph_format.page_break_before = True
    fh.paragraph_format.keep_with_next = True

    fc = new_style('FigureCaption')
    fc.base_style = styles['Normal']
    fc.font.name = BODY_FONT
    fc.font.size = Pt(10.5)
    fc.font.italic = True
    fc.font.bold = True
    fc.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    fc.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fc.paragraph_format.space_before = Pt(4)
    fc.paragraph_format.space_after = Pt(12)
    fc.paragraph_format.keep_with_next = False

    tc = new_style('TableCaption')
    tc.base_style = styles['Normal']
    tc.font.name = BODY_FONT
    tc.font.size = Pt(10.5)
    tc.font.italic = True
    tc.font.bold = True
    tc.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    tc.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    tc.paragraph_format.space_before = Pt(12)
    tc.paragraph_format.space_after = Pt(4)
    tc.paragraph_format.keep_with_next = True

    cs = new_style('CodeLine')
    cs.base_style = styles['Normal']
    cs.font.name = CODE_FONT
    cs.font.size = Pt(8)
    cs.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    cs.paragraph_format.space_before = Pt(0)
    cs.paragraph_format.space_after = Pt(0)
    cs.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT


# --------------------------------------------------------------------------- #
#  Inline formatting
# --------------------------------------------------------------------------- #
def add_inline(paragraph, text):
    text = text.replace('—', '—')
    parts = INLINE_RE.split(text)
    for part in parts:
        if not part:
            continue
        if part.startswith('**') and part.endswith('**') and len(part) > 4:
            r = paragraph.add_run(part[2:-2]); r.bold = True
        elif part.startswith('`') and part.endswith('`') and len(part) > 2:
            r = paragraph.add_run(part[1:-1]); r.font.name = CODE_FONT; r.font.size = Pt(10.5)
        elif part.startswith('*') and part.endswith('*') and len(part) > 2:
            r = paragraph.add_run(part[1:-1]); r.italic = True
        else:
            paragraph.add_run(part)


# --------------------------------------------------------------------------- #
#  Block renderers
# --------------------------------------------------------------------------- #
def render_code(doc, lines):
    # drop trailing blank lines
    while lines and lines[-1].strip() == "":
        lines.pop()
    while lines and lines[0].strip() == "":
        lines.pop(0)
    if not lines:
        return
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    shade_cell(cell, CODE_SHADE)
    # borders
    _set_table_borders(table, "BFBFBF", 4)
    cell.paragraphs[0].text = ""
    first = True
    for ln in lines:
        p = cell.paragraphs[0] if first else cell.add_paragraph()
        first = False
        p.style = doc.styles['CodeLine']
        run = p.add_run(ln if ln else "")
        run.font.name = CODE_FONT
        run.font.size = Pt(8)
        run._r.get_or_add_rPr()
        t = run._r.find(qn('w:t'))
        if t is not None:
            t.set(qn('xml:space'), 'preserve')
    # spacer paragraph after
    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(6)


def _set_table_borders(table, color="999999", sz=4):
    tbl = table._tbl
    tblPr = tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement(f'w:{edge}')
        e.set(qn('w:val'), 'single')
        e.set(qn('w:sz'), str(sz))
        e.set(qn('w:space'), '0')
        e.set(qn('w:color'), color)
        borders.append(e)
    tblPr.append(borders)


def render_table(doc, rows):
    # rows: list of raw markdown lines containing |
    cells = []
    for r in rows:
        r = r.strip()
        if r.startswith('|'):
            r = r[1:]
        if r.endswith('|'):
            r = r[:-1]
        cells.append([c.strip() for c in r.split('|')])
    # remove separator row (second row of dashes)
    if len(cells) >= 2 and all(set(c) <= set('-: ') and '-' in c for c in cells[1]):
        header = cells[0]
        body = cells[2:]
    else:
        header = cells[0]
        body = cells[1:]
    ncol = len(header)
    table = doc.add_table(rows=1, cols=ncol)
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    _set_table_borders(table, "9AA3B2", 4)
    hdr = table.rows[0].cells
    for i, h in enumerate(header):
        if i >= ncol:
            break
        shade_cell(hdr[i], HEADER_SHADE)
        p = hdr[i].paragraphs[0]
        p.text = ""
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        add_inline(p, h)
        for run in p.runs:
            run.bold = True
            run.font.size = Pt(10)
            run.font.name = BODY_FONT
    for row in body:
        rc = table.add_row().cells
        for i in range(ncol):
            val = row[i] if i < len(row) else ""
            p = rc[i].paragraphs[0]
            p.text = ""
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            add_inline(p, val)
            for run in p.runs:
                run.font.size = Pt(10)
                run.font.name = BODY_FONT
    doc.add_paragraph().paragraph_format.space_after = Pt(6)


def render_list(doc, items, numbered):
    for idx, (indent, text) in enumerate(items, 1):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.35 + 0.25 * indent)
        p.paragraph_format.first_line_indent = Inches(-0.22)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        bullet = f"{idx}. " if numbered else "•  "
        # keep author's explicit number if present
        add_inline(p, bullet + text)


def render_paragraph(doc, text):
    p = doc.add_paragraph()
    add_inline(p, text)


def heading(doc, level, text, front_mode):
    text = text.strip()
    if level == 1:
        if front_mode:
            p = doc.add_paragraph(style='FrontHeading')
            add_inline(p, text)
        else:
            p = doc.add_heading(level=1)
            p.text = ""
            add_inline(p, text)
    else:
        lv = min(level, 4)
        p = doc.add_heading(level=lv)
        p.text = ""
        add_inline(p, text)
    return p


def caption(doc, text):
    text = text.strip()
    is_table = re.match(r'^\*{0,2}Table', text, re.I)
    style = 'TableCaption' if is_table else 'FigureCaption'
    # strip surrounding ** if the whole label was bolded
    p = doc.add_paragraph(style=style)
    add_inline(p, text)
    return p


# --------------------------------------------------------------------------- #
#  Markdown file renderer
# --------------------------------------------------------------------------- #
def render_markdown(doc, path, front_mode=False):
    with open(path, encoding='utf-8') as f:
        lines = f.read().replace('\r\n', '\n').split('\n')

    i = 0
    n = len(lines)
    para_buf = []

    def flush_para():
        nonlocal para_buf
        if para_buf:
            render_paragraph(doc, " ".join(para_buf).strip())
            para_buf = []

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # fenced code block
        if stripped.startswith('```'):
            flush_para()
            code = []
            i += 1
            while i < n and not lines[i].strip().startswith('```'):
                code.append(lines[i])
                i += 1
            i += 1  # skip closing fence
            render_code(doc, code)
            continue

        # blank line
        if stripped == "":
            flush_para()
            i += 1
            continue

        # headings
        m = re.match(r'^(#{1,6})\s+(.*)$', line)
        if m:
            flush_para()
            level = len(m.group(1))
            heading(doc, level, m.group(2), front_mode)
            i += 1
            continue

        # caption
        if CAP_RE.match(stripped):
            flush_para()
            caption(doc, stripped)
            i += 1
            continue

        # table (line with | and a separator on the next line)
        if '|' in stripped and i + 1 < n and re.match(r'^\s*\|?[\s:\-|]+\|[\s:\-|]*$', lines[i + 1]):
            flush_para()
            tbl = []
            while i < n and '|' in lines[i] and lines[i].strip() != "":
                tbl.append(lines[i])
                i += 1
            render_table(doc, tbl)
            continue

        # horizontal rule -> skip
        if re.match(r'^(\*{3,}|-{3,}|_{3,})$', stripped):
            flush_para()
            i += 1
            continue

        # bullet list
        if re.match(r'^(\s*)[-*]\s+', line):
            flush_para()
            items = []
            while i < n and re.match(r'^(\s*)[-*]\s+', lines[i]):
                mm = re.match(r'^(\s*)[-*]\s+(.*)$', lines[i])
                indent = len(mm.group(1)) // 2
                items.append((indent, mm.group(2)))
                i += 1
            render_list(doc, items, numbered=False)
            continue

        # numbered list
        if re.match(r'^(\s*)\d+\.\s+', line):
            flush_para()
            items = []
            while i < n and re.match(r'^(\s*)\d+\.\s+', lines[i]):
                mm = re.match(r'^(\s*)\d+\.\s+(.*)$', lines[i])
                indent = len(mm.group(1)) // 2
                items.append((indent, mm.group(2)))
                i += 1
            render_list(doc, items, numbered=True)
            continue

        # ordinary paragraph line (accumulate)
        para_buf.append(stripped)
        i += 1

    flush_para()


def front_page_heading(doc, text):
    p = doc.add_paragraph(style='FrontHeading')
    p.add_run(text)
    return p


# --------------------------------------------------------------------------- #
#  Assembly
# --------------------------------------------------------------------------- #
def main():
    doc = Document()
    build_styles(doc)

    # ---- Section 1 : front matter (Roman numerals) ----
    sec1 = doc.sections[0]
    sec1.page_width = Mm(210)
    sec1.page_height = Mm(297)
    sec1.left_margin = Inches(1.5)
    sec1.right_margin = Inches(1.0)
    sec1.top_margin = Inches(1.0)
    sec1.bottom_margin = Inches(1.0)
    sec1.different_first_page_header_footer = True   # title page unnumbered
    set_page_numbering(sec1, 'lowerRoman', 1)
    footer_page_number(sec1, prefix="")

    render_markdown(doc, os.path.join(CH, "00_front.md"), front_mode=True)

    # Table of contents
    front_page_heading(doc, "TABLE OF CONTENTS")
    ptoc = doc.add_paragraph()
    add_field(ptoc, 'TOC \\o "1-3" \\h \\z \\u',
              placeholder="Right-click here and choose 'Update Field' to build the Table of Contents.")

    # List of figures
    front_page_heading(doc, "LIST OF FIGURES")
    plof = doc.add_paragraph()
    add_field(plof, 'TOC \\h \\z \\t "FigureCaption,1"',
              placeholder="Right-click here and choose 'Update Field' to build the List of Figures.")

    # List of tables
    front_page_heading(doc, "LIST OF TABLES")
    plot = doc.add_paragraph()
    add_field(plot, 'TOC \\h \\z \\t "TableCaption,1"',
              placeholder="Right-click here and choose 'Update Field' to build the List of Tables.")

    render_markdown(doc, os.path.join(CH, "00z_abbrev.md"), front_mode=True)

    # ---- Section 2 : body (Arabic numerals, restart at 1) ----
    body = doc.add_section(WD_SECTION.NEW_PAGE)
    body.page_width = Mm(210)
    body.page_height = Mm(297)
    body.left_margin = Inches(1.5)
    body.right_margin = Inches(1.0)
    body.top_margin = Inches(1.0)
    body.bottom_margin = Inches(1.0)
    body.different_first_page_header_footer = False
    set_page_numbering(body, 'decimal', 1)
    footer_page_number(body, prefix="")
    header_text(body, "Inventory Management System")

    body_files = [
        "01_intro.md", "02_litsurvey.md", "03_sysanalysis.md",
        "04_sysdesign.md", "05_implementation.md", "06_results.md",
        "07_analysis.md", "08_conclusion.md",
        "09_annexure_a.md", "10_annexure_b.md", "11_annexure_c.md",
    ]
    for fname in body_files:
        fpath = os.path.join(CH, fname)
        if os.path.exists(fpath):
            render_markdown(doc, fpath, front_mode=False)

    # Make Word refresh the TOC/LoF/LoT on open.
    settings = doc.settings.element
    uf = OxmlElement('w:updateFields')
    uf.set(qn('w:val'), 'true')
    settings.append(uf)

    doc.save(OUT)
    print("Saved:", OUT)


if __name__ == "__main__":
    main()
