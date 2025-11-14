"""Simple PDF generator for supplier reports."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib import colors

from .config import REPORT_TYPES, BRANDING, PDF_CONFIG


def generate_pdf(report_data: dict, output_path: Path) -> None:
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=PDF_CONFIG["margins"]["left"] * mm,
        rightMargin=PDF_CONFIG["margins"]["right"] * mm,
        topMargin=PDF_CONFIG["margins"]["top"] * mm,
        bottomMargin=PDF_CONFIG["margins"]["bottom"] * mm,
    )
    story: list[Any] = []
    title_style = ParagraphStyle(name="Title", fontSize=18, leading=22, spaceAfter=12)
    body_style = ParagraphStyle(name="Body", fontSize=11, leading=14)
    story.append(Paragraph(report_data["title"], title_style))
    story.append(Paragraph(REPORT_TYPES[report_data["report_type"]]["description"], body_style))
    story.append(Spacer(1, 12))
    summary_table = Table(
        [
            ["Fornecedor", report_data["supplier_name"]],
            ["Contrato", report_data["contract_title"]],
            ["Periodo", f"{report_data['period_start']} a {report_data['period_end']}"],
        ]
    )
    summary_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey), ("BOX", (0, 0), (-1, -1), 1, colors.black)]))
    story.append(summary_table)
    story.append(Spacer(1, 12))
    for section in report_data["sections"]:
        story.append(Paragraph(section["title"], title_style))
        for entry in section.get("content", []):
            if isinstance(entry, str):
                story.append(Paragraph(entry, body_style))
            elif isinstance(entry, dict) and entry.get("type") == "metrics":
                data = [[m["label"], m["value"]] for m in entry.get("metrics", [])]
                table = Table(data)
                table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.3, colors.grey)]))
                story.append(table)
            else:
                story.append(Paragraph(repr(entry), body_style))
        story.append(Spacer(1, 12))
    doc.build(story)
