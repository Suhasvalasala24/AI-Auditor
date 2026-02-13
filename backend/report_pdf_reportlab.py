from __future__ import annotations
from io import BytesIO
from typing import Any, Dict, List
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, 
    TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.piecharts import Pie

# SECURA-Style Color Palette
# Standardized based on common IoT Security reporting themes
COLOR_PALETTE = {
    "CRITICAL": "#991b1b", # Deep Red
    "HIGH": "#ea580c",     # Vivid Orange
    "MEDIUM": "#d97706",   # Amber
    "LOW": "#166534",      # Dark Green
    "INFO": "#374151",     # Slate Gray
    "HEADER_BG": "#111827",# Dark Navy
    "SUBTLE_BG": "#f9fafb" # Off White
}

def _get_color(sev: str):
    return colors.HexColor(COLOR_PALETTE.get(str(sev).upper(), "#374151"))

def create_severity_pie(summary: Dict[str, int]) -> Drawing:
    """Creates a high-quality vector pie chart for the executive summary."""
    d = Drawing(200, 100)
    pc = Pie()
    pc.x = 50
    pc.y = 0
    pc.width = 100
    pc.height = 100
    
    # Order matters for consistent chart colors
    labels = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    pc.data = [summary.get(l, 0) for l in labels]
    
    # Use standard palette
    pc.slices[0].fillColor = colors.HexColor(COLOR_PALETTE["CRITICAL"])
    pc.slices[1].fillColor = colors.HexColor(COLOR_PALETTE["HIGH"])
    pc.slices[2].fillColor = colors.HexColor(COLOR_PALETTE["MEDIUM"])
    pc.slices[3].fillColor = colors.HexColor(COLOR_PALETTE["LOW"])
    
    # Only label slices that exist
    pc.labels = [f"{l}" if summary.get(l, 0) > 0 else "" for l in labels]
    
    d.add(pc)
    return d

def generate_audit_pdf_bytes(report: Dict[str, Any]) -> bytes:
    """
    Master PDF Generator.
    Builds a professional multi-page document including:
    1. Branding & Cover Page
    2. SECURA Security Posture Summary
    3. Findings with Remediation & Evidence Logs
    """
    audit = report.get("audit_metadata", {})
    stats = report.get("stats", {})
    
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, 
        leftMargin=1.5*cm, rightMargin=1.5*cm, 
        topMargin=1.5*cm, bottomMargin=1.5*cm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Enterprise Styles
    title_style = ParagraphStyle(
        "CoverTitle", parent=styles["Heading1"], fontSize=26, 
        textColor=colors.HexColor(COLOR_PALETTE["HEADER_BG"]), 
        alignment=1, spaceAfter=20
    )
    header_style = ParagraphStyle(
        "SectionHeader", parent=styles["Heading2"], fontSize=16, 
        textColor=colors.HexColor(COLOR_PALETTE["HEADER_BG"]), 
        spaceBefore=20, spaceAfter=10, borderPadding=5,
        borderWidth=0, borderStyle=None
    )
    finding_head_style = ParagraphStyle(
        "FindingHeader", parent=styles["Heading3"], fontSize=12, 
        leading=14, spaceBefore=10
    )
    body_style = ParagraphStyle(
        "StandardBody", parent=styles["BodyText"], fontSize=10, leading=14
    )
    evidence_style = ParagraphStyle(
        "EvidenceText", parent=styles["Code"], fontSize=8, 
        leading=11, leftIndent=20, textColor=colors.HexColor("#4b5563"),
        backColor=colors.HexColor("#f3f4f6"), borderPadding=8
    )
    
    story = []

    # =========================================================================
    # PAGE 1: COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 6*cm))
    story.append(Paragraph("AI AUDITOR PLATFORM", styles["Normal"]))
    story.append(Paragraph("Enterprise Security & Risk Assessment", title_style))
    story.append(Spacer(1, 1*cm))
    
    cover_data = [
        ["Model Name:", audit.get("model_name", "Unknown")],
        ["Model ID:", audit.get("model_id", "-")],
        ["Audit Run ID:", audit.get("audit_id", "-")],
        ["Execution Date:", audit.get("executed_at", "-")],
        ["Audit Result:", audit.get("result", "-")],
    ]
    
    ct = Table(cover_data, colWidths=[4*cm, 10*cm])
    ct.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(ct)
    story.append(Spacer(1, 4*cm))
    story.append(Paragraph("<b>CONFIDENTIAL: FOR INTERNAL USE ONLY</b>", styles["Normal"]))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: EXECUTIVE SUMMARY & DASHBOARD
    # =========================================================================
    story.append(Paragraph("Executive Summary", header_style))
    
    # 1. Dashboard Table (Stats + Pie Chart)
    summary_bullets = []
    for line in report.get("executive_summary", []):
        summary_bullets.append(Paragraph(f"• {line}", body_style))
    
    pie = create_severity_pie(stats.get("severity_summary", {}))
    
    dash_table = Table([[summary_bullets, pie]], colWidths=[11*cm, 7*cm])
    dash_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(dash_table)
    story.append(Spacer(1, 1*cm))

    # 2. Risk Scorecard
    story.append(Paragraph("Risk Scorecard", styles["Heading3"]))
    metric_rows = [["Metric Family", "Risk Score", "Band", "L", "I", "R"]]
    for m in report.get("metric_breakdown", []):
        metric_rows.append([
            m.get("metric", "").title(),
            f"{m.get('score_100', 0)}",
            m.get("band", "-"),
            f"{m.get('L', 0):.2f}",
            f"{m.get('I', 0):.2f}",
            f"{m.get('R', 0):.2f}",
        ])
    
    mt = Table(metric_rows, colWidths=[4*cm, 3*cm, 3*cm, 2*cm, 2*cm, 2*cm])
    mt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor(COLOR_PALETTE["HEADER_BG"])),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(mt)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3+: DETAILED VULNERABILITIES & MITIGATION
    # =========================================================================
    story.append(Paragraph("Architectural Vulnerabilities & Remediation", header_style))
    story.append(Paragraph("This section outlines specific model logic failures and architectural engineering fixes.", body_style))
    story.append(Spacer(1, 0.5*cm))

    for idx, v in enumerate(report.get("vulnerabilities", [])):
        v_story = []
        
        # Heading with Severity Color
        sev = v.get("severity", "MEDIUM")
        v_story.append(Paragraph(
            f"ID-0{idx+1}: <font color='{COLOR_PALETTE.get(sev)}'><b>[{sev}]</b></font> {v.get('category')} - {v.get('metric_name')}", 
            finding_head_style
        ))
        
        # Details Table
        rem = v.get("remediation", {})
        detail_data = [
            ["Vulnerability:", v.get("description", "-")],
            ["Business Impact:", v.get("impact", "-")],
            ["Root Cause:", rem.get("root_cause", "-")],
            ["Technical Fix:", "\n".join(rem.get("fix_steps", []))],
            ["Remediation SLA:", f"{rem.get('sla', '-')} (Priority: {rem.get('priority', '-')})"],
            ["Assigned Owner:", rem.get("owner", "-")]
        ]
        
        dt = Table(detail_data, colWidths=[3.5*cm, 14.5*cm])
        dt.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e5e7eb")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor(COLOR_PALETTE["SUBTLE_BG"])),
        ]))
        v_story.append(dt)
        
        # Evidence Appendix for this finding
        if v.get("evidence_logs"):
            v_story.append(Spacer(1, 0.3*cm))
            v_story.append(Paragraph("<b>Evidence Log Sample:</b>", body_style))
            ev = v["evidence_logs"][0] # Show the primary smoking gun
            
            v_story.append(Paragraph(f"<b>Prompt:</b> {ev.get('prompt_text')[:400]}...", evidence_style))
            v_story.append(Spacer(1, 0.2*cm))
            v_story.append(Paragraph(f"<b>AI Response:</b> {ev.get('response_text')[:400]}...", evidence_style))

        v_story.append(Spacer(1, 1*cm))
        v_story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb")))
        v_story.append(Spacer(1, 0.5*cm))
        
        # Keep finding together to prevent breaking across pages
        story.append(KeepTogether(v_story))

    # Build the document
    doc.build(story)
    
    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes