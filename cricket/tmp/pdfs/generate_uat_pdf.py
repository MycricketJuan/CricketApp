from __future__ import annotations

import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/spec/cricket-phase1-user-acceptance-tests.md"
OUTPUT = ROOT / "output/pdf/cricket-phase1-plan-pruebas-aceptacion.pdf"

NAVY = colors.HexColor("#0F172A")
GREEN = colors.HexColor("#15803D")
LIGHT_GREEN = colors.HexColor("#ECFDF5")
BLUE = colors.HexColor("#2563EB")
LIGHT_BLUE = colors.HexColor("#EFF6FF")
SLATE = colors.HexColor("#475569")
LIGHT_SLATE = colors.HexColor("#F1F5F9")
BORDER = colors.HexColor("#CBD5E1")
WHITE = colors.white


def register_fonts() -> None:
    font_dir = Path("/System/Library/Fonts/Supplemental")
    pdfmetrics.registerFont(TTFont("Cricket", str(font_dir / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("Cricket-Bold", str(font_dir / "Arial Bold.ttf")))
    pdfmetrics.registerFont(TTFont("Cricket-Italic", str(font_dir / "Arial Italic.ttf")))
    pdfmetrics.registerFontFamily(
        "Cricket",
        normal="Cricket",
        bold="Cricket-Bold",
        italic="Cricket-Italic",
        boldItalic="Cricket-Bold",
    )


def inline_markup(text: str) -> str:
    text = text.replace("—", "-").replace("–", "-").replace("‑", "-")
    links: list[tuple[str, str]] = []

    def save_link(match: re.Match[str]) -> str:
        links.append((match.group(1), match.group(2)))
        return f"@@LINK{len(links) - 1}@@"

    text = re.sub(r"\[([^]]+)\]\(([^)]+)\)", save_link, text)
    code: list[str] = []

    def save_code(match: re.Match[str]) -> str:
        code.append(match.group(1))
        return f"@@CODE{len(code) - 1}@@"

    text = re.sub(r"`([^`]+)`", save_code, text)
    text = escape(text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    for index, value in enumerate(code):
        text = text.replace(f"@@CODE{index}@@", f'<font name="Courier" color="#334155">{escape(value)}</font>')
    for index, (label, href) in enumerate(links):
        text = text.replace(
            f"@@LINK{index}@@",
            f'<link href="{escape(href)}" color="#2563EB"><u>{escape(label)}</u></link>',
        )
    return text


def styles():
    sheet = getSampleStyleSheet()
    return {
        "cover_title": ParagraphStyle(
            "CoverTitle", parent=sheet["Title"], fontName="Cricket-Bold",
            fontSize=27, leading=33, textColor=NAVY, alignment=TA_LEFT,
            spaceAfter=10,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle", fontName="Cricket", fontSize=13, leading=19,
            textColor=SLATE, spaceAfter=8,
        ),
        "h1": ParagraphStyle(
            "H1", fontName="Cricket-Bold", fontSize=18, leading=22,
            textColor=NAVY, spaceBefore=10, spaceAfter=8, keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "H2", fontName="Cricket-Bold", fontSize=13.5, leading=17,
            textColor=NAVY, spaceBefore=12, spaceAfter=6, keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "H3", fontName="Cricket-Bold", fontSize=11.2, leading=14,
            textColor=GREEN, spaceBefore=10, spaceAfter=5, keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "Body", fontName="Cricket", fontSize=9.2, leading=13.2,
            textColor=NAVY, spaceAfter=5,
        ),
        "bullet": ParagraphStyle(
            "Bullet", fontName="Cricket", fontSize=9.2, leading=13.2,
            textColor=NAVY, leftIndent=14, firstLineIndent=-8, spaceAfter=3,
        ),
        "number": ParagraphStyle(
            "Number", fontName="Cricket", fontSize=9.2, leading=13.2,
            textColor=NAVY, leftIndent=18, firstLineIndent=-13, spaceAfter=3,
        ),
        "quote": ParagraphStyle(
            "Quote", fontName="Cricket-Italic", fontSize=8.8, leading=12.6,
            textColor=SLATE, leftIndent=9, rightIndent=6, borderColor=GREEN,
            borderWidth=2, borderPadding=(6, 8, 6, 9), backColor=LIGHT_GREEN,
            spaceBefore=5, spaceAfter=8,
        ),
        "table_head": ParagraphStyle(
            "TableHead", fontName="Cricket-Bold", fontSize=7.5, leading=9.4,
            textColor=WHITE, alignment=TA_LEFT,
        ),
        "table_body": ParagraphStyle(
            "TableBody", fontName="Cricket", fontSize=7.3, leading=9.2,
            textColor=NAVY,
        ),
        "footer": ParagraphStyle(
            "Footer", fontName="Cricket", fontSize=7.5, leading=9,
            textColor=SLATE, alignment=TA_CENTER,
        ),
    }


def page_decor(canvas, doc) -> None:
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, height - 13 * mm, width, 13 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Cricket-Bold", 8)
    canvas.drawString(18 * mm, height - 8.5 * mm, "CRICKET  |  FASE 1")
    canvas.setStrokeColor(BORDER)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFillColor(SLATE)
    canvas.setFont("Cricket", 7.5)
    canvas.drawString(18 * mm, 8.5 * mm, "Plan de pruebas de aceptacion de usuario")
    canvas.drawRightString(width - 18 * mm, 8.5 * mm, f"Pagina {doc.page}")
    canvas.restoreState()


def cover(st, source_lines: list[str]):
    date = "21 de julio de 2026"
    objective = next((line for line in source_lines if line.startswith("**Objetivo:**")), "")
    objective = objective.replace("**Objetivo:**", "").strip()
    return [
        Spacer(1, 33 * mm),
        Table([[Paragraph("CRICKET", ParagraphStyle(
            "Brand", fontName="Cricket-Bold", fontSize=11, textColor=WHITE,
        ))]], colWidths=[38 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), GREEN),
            ("BOX", (0, 0), (-1, -1), 0, GREEN),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ])),
        Spacer(1, 12 * mm),
        Paragraph("Plan de pruebas de aceptacion de usuario", st["cover_title"]),
        Paragraph("Cricket - Fase 1", ParagraphStyle(
            "CoverPhase", parent=st["cover_title"], fontSize=20, leading=25,
            textColor=GREEN,
        )),
        Spacer(1, 8 * mm),
        Table([[Paragraph(inline_markup(objective), st["cover_subtitle"])]],
              colWidths=[160 * mm], style=TableStyle([
                  ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BLUE),
                  ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#BFDBFE")),
                  ("LEFTPADDING", (0, 0), (-1, -1), 12),
                  ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                  ("TOPPADDING", (0, 0), (-1, -1), 11),
                  ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
              ])),
        Spacer(1, 42 * mm),
        Paragraph(f"Documento para validacion funcional y operativa<br/><b>{date}</b>", st["cover_subtitle"]),
        PageBreak(),
    ]


def make_table(rows: list[list[str]], st):
    count = len(rows[0])
    width = 174 * mm
    if count == 5:
        col_widths = [14 * mm, 40 * mm, 30 * mm, 61 * mm, 29 * mm]
    elif count == 7:
        col_widths = [23 * mm, 17 * mm, 20 * mm, 32 * mm, 32 * mm, 25 * mm, 25 * mm]
    else:
        col_widths = [width / count] * count
    data = []
    for row_idx, row in enumerate(rows):
        style = st["table_head"] if row_idx == 0 else st["table_body"]
        data.append([Paragraph(inline_markup(cell.strip()), style) for cell in row])
    table = Table(data, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_SLATE]),
        ("GRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def parse_markdown(lines: list[str], st):
    story = []
    table_rows: list[list[str]] = []

    def flush_table():
        nonlocal table_rows
        if table_rows:
            story.extend([make_table(table_rows, st), Spacer(1, 5)])
            table_rows = []

    for raw in lines:
        line = raw.rstrip()
        if line.startswith("# "):
            continue
        if line.startswith("**Fecha:**") or line.startswith("**Fuentes:**") or line.startswith("**Objetivo:**"):
            continue
        if line.startswith("|") and line.endswith("|"):
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            if all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
                continue
            table_rows.append(cells)
            continue
        flush_table()
        if not line:
            story.append(Spacer(1, 3))
        elif line.startswith("## "):
            story.append(Paragraph(inline_markup(line[3:]), st["h1"]))
        elif line.startswith("### "):
            story.append(Paragraph(inline_markup(line[4:]), st["h2"]))
        elif line.startswith("> "):
            story.append(Paragraph(inline_markup(line[2:]), st["quote"]))
        elif re.match(r"^\d+\. ", line):
            match = re.match(r"^(\d+)\. (.*)$", line)
            assert match
            story.append(Paragraph(f"<b>{match.group(1)}.</b> {inline_markup(match.group(2))}", st["number"]))
        elif line.startswith("- "):
            story.append(Paragraph(f"- {inline_markup(line[2:])}", st["bullet"]))
        else:
            story.append(Paragraph(inline_markup(line), st["body"]))
    flush_table()
    return story


def build() -> None:
    register_fonts()
    st = styles()
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=20 * mm, bottomMargin=18 * mm,
        title="Plan de pruebas de aceptacion de usuario - Cricket Fase 1",
        author="Cricket",
        subject="Pruebas de aceptacion trazadas al SPEC de Cricket Fase 1",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="content", frames=frame, onPage=page_decor)])
    story = cover(st, lines)
    story.extend(parse_markdown(lines, st))
    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build()
