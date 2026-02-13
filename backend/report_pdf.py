from __future__ import annotations

from typing import Dict, Any, List
from datetime import datetime
from jinja2 import Template

from .remediation_playbook import explain_category, remediation_steps

# ENTERPRISE PENTEST TEMPLATE
# Replicates the branding, layout, and density of professional IoT security reports
HTML_TEMPLATE = """
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>COE SECURITY - AI PenTest Report</title>
  <style>
    @page { margin: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1f2937; margin: 0; line-height: 1.5; background: #fff; }
    
    /* Branding Colors */
    :root {
      --primary-navy: #111827;
      --accent-orange: #ea580c;
      --critical-red: #991b1b;
      --high-orange: #ea580c;
      --medium-amber: #d97706;
      --low-green: #166534;
      --subtle-gray: #f9fafb;
    }

    /* Page Layout */
    .page { width: 210mm; height: 297mm; padding: 20mm; box-sizing: border-box; position: relative; page-break-after: always; }
    .header { border-bottom: 2px solid var(--primary-navy); padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; }
    .footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 9px; color: #6b7280; }
    
    /* Cover Page */
    .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%; }
    .cover-logo { font-size: 32px; font-weight: 900; letter-spacing: 2px; color: var(--primary-navy); margin-bottom: 10px; }
    .cover-title { font-size: 48px; font-weight: 800; margin: 40px 0; color: var(--primary-navy); }
    .cover-details { font-size: 14px; margin-top: 50px; text-align: left; width: 60%; border-left: 4px solid var(--accent-orange); padding-left: 20px; }

    /* Dashboard & Score */
    .score-gauge { text-align: center; margin: 30px 0; padding: 20px; background: var(--subtle-gray); border-radius: 12px; }
    .score-val { font-size: 42px; font-weight: 900; color: var(--medium-amber); }
    .severity-summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0; }
    .severity-box { padding: 15px; text-align: center; border-radius: 6px; color: #fff; font-weight: 800; }

    /* Vulnerability Tables */
    .vuln-header { background: var(--primary-navy); color: #fff; padding: 12px 15px; font-size: 14px; font-weight: 800; border-radius: 4px 4px 0 0; }
    .vuln-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .vuln-table th { background: var(--subtle-gray); border: 1px solid #e5e7eb; padding: 10px; text-align: left; width: 30%; font-weight: 700; text-transform: uppercase; font-size: 9px; }
    .vuln-table td { border: 1px solid #e5e7eb; padding: 10px; vertical-align: top; }
    
    .badge { font-weight: 800; padding: 3px 8px; font-size: 10px; border-radius: 4px; color: #fff; text-transform: uppercase; }
    .CRITICAL { background: var(--critical-red); }
    .HIGH { background: var(--high-orange); }
    .MEDIUM { background: var(--medium-amber); }
    .LOW { background: var(--low-green); }

    /* Evidence Block */
    .evidence-box { background: #111827; color: #10b981; font-family: 'Courier New', monospace; padding: 15px; border-radius: 4px; font-size: 9px; margin-top: 10px; overflow: hidden; }
  </style>
</head>
<body>

  <div class="page">
    <div class="cover">
      <div class="cover-logo">COE SECURITY</div>
      <div class="cover-title">AI Model PenTest<br/>Detailed Report</div>
      <div class="cover-details">
        <p><b>Date:</b> {{ audit.executed_at }}</p>
        <p><b>Prepared for:</b> {{ audit.model_name }}</p>
        <p><b>Audit ID:</b> {{ audit.audit_id }}</p>
      </div>
    </div>
    <div class="footer">COE Security LLC • Empowering Businesses with Confidence in Their Security</div>
  </div>

  <div class="page">
    <div class="header">
      <div style="font-weight: 800;">COE SECURITY</div>
      <div style="color: #6b7280;">Audit ID: {{ audit.audit_id }}</div>
    </div>

    <h2 style="font-size: 20px; font-weight: 800;">Executive Summary</h2>
    <p style="font-size: 12px; color: #4b5563;">
      COE Security LLC conducted a comprehensive AI penetration test for <b>{{ audit.model_name }}</b>. 
      The objective was to assess end-to-end risks including safety guardrails, privacy compliance, and architectural integrity.
    </p>

    <div class="score-gauge">
      <div style="text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">SECURA Security Score</div>
      <div class="score-val">{{ global_risk.score_100 }}%</div>
      <div style="font-weight: 700; color: #6b7280;">POSTURE: MODERATE</div>
    </div>

    <h3>Vulnerability Severity Summary</h3>
    <div class="severity-summary">
      <div class="severity-box CRITICAL">Critical<br/>{{ counts.by_severity.CRITICAL }}</div>
      <div class="severity-box HIGH">High<br/>{{ counts.by_severity.HIGH }}</div>
      <div class="severity-box MEDIUM">Medium<br/>{{ counts.by_severity.MEDIUM }}</div>
      <div class="severity-box LOW">Low<br/>{{ counts.by_severity.LOW }}</div>
      <div class="severity-box" style="background: #374151;">Info<br/>{{ counts.by_severity.INFO }}</div>
    </div>

    <div class="footer">Page 2 of {{ total_pages }}</div>
  </div>

  {% for f in findings %}
  <div class="page">
    <div class="header">
      <div style="font-weight: 800;">COE SECURITY</div>
      <div style="color: #6b7280;">Exploitable Vulnerability Details</div>
    </div>

    <div class="vuln-header">{{ f.category }} - {{ f.metric_name }}</div>
    <table class="vuln-table">
      <tr><th>Severity</th><td><span class="badge {{ f.severity }}">{{ f.severity }}</span></td></tr>
      <tr><th>Vulnerability Type</th><td>Exploitable</td></tr>
      <tr><th>Category</th><td>{{ f.explain.title }}</td></tr>
      <tr><th>CVSS Score</th><td>{{ f.cvss_simulated or 'N/A' }}</td></tr>
    </table>

    <h4 style="text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Vulnerability Description</h4>
    <p>{{ f.description }}</p>
    <p><i>{{ f.explain.why_it_matters }}</i></p>

    <h4 style="text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Remediation Steps</h4>
    <ul>
      {% for step in f.remediation.fix_steps %}
        <li>{{ step }}</li>
      {% endfor %}
    </ul>
    <p style="margin-top: 10px;"><b>Assigned Owner:</b> {{ f.remediation.recommended_owner }}</p>

    <h4 style="text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Evidence Appendix (Sample)</h4>
    {% for ev in f.evidence_samples %}
    <div class="evidence-box">
      <div style="color: #6b7280; margin-bottom: 5px;"># PROMPT ID: {{ ev.prompt_id }}</div>
      <div style="color: #fff;">[INPUT]: {{ ev.prompt[:250] }}...</div>
      <div style="margin-top: 8px;">[OUTPUT]: {{ ev.response[:250] }}...</div>
    </div>
    {% endfor %}

    <div class="footer">Page {{ loop.index + 2 }} of {{ total_pages }}</div>
  </div>
  {% endfor %}

</body>
</html>
"""

def render_pdf_html(structured_report: Dict[str, Any]) -> str:
    t = Template(HTML_TEMPLATE)

    findings = structured_report.get("grouped_findings", [])
    total_pages = len(findings) + 2 # Cover + Summary + Each Vuln

    html = t.render(
        audit=structured_report.get("audit", {}),
        executive_summary=structured_report.get("executive_summary", []),
        counts=structured_report.get("summary", {}),
        global_risk=structured_report.get("global_risk", {}),
        findings=findings,
        total_pages=total_pages,
        generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
    )
    return html