import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 11 * 72 - 36, "DevSight AI — Project Master Guide & Viva Documentation")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 11 * 72 - 42, 8.5 * 72 - 54, 11 * 72 - 42)
            
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * 72 - 54, 36, footer_text)
        self.drawString(54, 36, "Confidential & Proprietary — DevSight AI")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 8.5 * 72 - 54, 48)
        
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#1e1b4b")   # Dark Indigo
    accent_color = colors.HexColor("#4338ca")    # Indigo
    highlight_color = colors.HexColor("#4f46e5") # Bright Indigo
    text_dark = colors.HexColor("#0f172a")       # Slate 900
    text_muted = colors.HexColor("#475569")      # Slate 600

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=accent_color,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=accent_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_dark,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1e293b")
    )

    qa_q_style = ParagraphStyle(
        'QA_Q',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=primary_color,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    qa_a_style = ParagraphStyle(
        'QA_A',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=text_dark,
        spaceAfter=8
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=text_dark
    )

    story = []

    # Title & Metadata Banner
    story.append(Paragraph("DevSight AI — Project Master Guide", title_style))
    story.append(Paragraph("Autonomous Cloud Observability, AI Root Cause Diagnosis & Viva Preparation", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=highlight_color, spaceBefore=0, spaceAfter=12))

    # Meta table
    meta_data = [
        [
            Paragraph("<b>Repository:</b> github.com/LalithKrishna12/DevSight-Real-Time", table_cell_style),
            Paragraph("<b>Architecture:</b> Microservices Observability Monolith", table_cell_style)
        ],
        [
            Paragraph("<b>Stack:</b> React 18, TypeScript, Node/Express, Prisma, PostgreSQL", table_cell_style),
            Paragraph("<b>AI Engine:</b> Claude 3.7 + Heuristic Fallback Engine", table_cell_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[260, 244])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # Section 1: Executive Summary
    story.append(Paragraph("1. Executive Summary & Problem Statement", h1_style))
    story.append(Paragraph(
        "Modern cloud environments consist of dozens of distributed microservices. When incidents or slowdowns occur, "
        "engineering teams are bombarded with hundreds of metric graphs and cryptic error logs. Identifying the true root cause "
        "during high-severity outages often takes hours of manual correlation.",
        body_style
    ))
    story.append(Paragraph(
        "<b>DevSight AI</b> is an autonomous observability platform that actively diagnoses failures. Instead of just displaying "
        "graphs, it detects statistical metric anomalies, correlates telemetry snapshots with error logs, and delivers an "
        "actionable, plain-English root cause explanation with remediation steps in under three seconds.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # Section 2: Technical Architecture
    story.append(Paragraph("2. System Architecture & Core Components", h1_style))
    
    arch_data = [
        [Paragraph("Component", table_header_style), Paragraph("Technology", table_header_style), Paragraph("Responsibility", table_header_style)],
        [
            Paragraph("<b>Frontend UI</b>", table_cell_style),
            Paragraph("React 18, TypeScript, Vite", table_cell_style),
            Paragraph("Low-glare dark ops dashboard, real-time auto-refresh, incident drill-down, live log stream & 1-click anomaly simulator.", table_cell_style)
        ],
        [
            Paragraph("<b>API & Backend</b>", table_cell_style),
            Paragraph("Node.js, Express.js", table_cell_style),
            Paragraph("REST endpoints for auth, metrics ingestion, log query, service management, and incident lifecycles.", table_cell_style)
        ],
        [
            Paragraph("<b>Database Layer</b>", table_cell_style),
            Paragraph("PostgreSQL, Prisma ORM", table_cell_style),
            Paragraph("Type-safe relational storage for Multi-tenant Orgs, Users, Monitored Services, Metrics, Logs, and Incidents.", table_cell_style)
        ],
        [
            Paragraph("<b>Anomaly Detector</b>", table_cell_style),
            Paragraph("Statistical 3σ Rolling Baseline", table_cell_style),
            Paragraph("Computes rolling mean and standard deviation over last 200 samples; flags metrics deviating by >= 3σ.", table_cell_style)
        ],
        [
            Paragraph("<b>AI Root Cause Engine</b>", table_cell_style),
            Paragraph("Claude 3.7 + Heuristic Core", table_cell_style),
            Paragraph("Correlates anomalous metrics and error logs into structured diagnosis: What Failed, Why, Impact, Suggested Fix.", table_cell_style)
        ],
        [
            Paragraph("<b>Alert Engine</b>", table_cell_style),
            Paragraph("Multi-Channel Dispatcher", table_cell_style),
            Paragraph("Instant webhook formatting and delivery across Slack, Email (SMTP), and Microsoft Teams.", table_cell_style)
        ],
    ]
    arch_table = Table(arch_data, colWidths=[110, 130, 264])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), accent_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 14))

    # Section 3: End-to-End Pipeline
    story.append(Paragraph("3. Autonomous Incident Pipeline Workflow", h1_style))
    pipeline_steps = [
        "<b>Step 1 — Ingestion:</b> Microservice agents POST telemetry data to <code>/api/metrics/ingest</code>.",
        "<b>Step 2 — Statistical Evaluation:</b> <code>recordMetricAndCheck</code> recalculates rolling baseline. If <code>deviation >= 3σ</code>, an anomaly is flagged.",
        "<b>Step 3 — Context Snapshot:</b> <code>triggerIncidentAnalysis</code> pulls the latest 20 metric points and 30 logs for that service.",
        "<b>Step 4 — AI Root Cause Synthesis:</b> AI correlates logs and metrics to generate a plain-English explanation.",
        "<b>Step 5 — Incident Persistence & Alerts:</b> Incident is saved with status <code>OPEN</code>; alerts are dispatched to Slack/Email/Teams.",
        "<b>Step 6 — Live Dashboard Update:</b> Service status turns <code>DEGRADED</code> and the incident report appears on the unified dashboard."
    ]
    for step in pipeline_steps:
        story.append(Paragraph(f"• {step}", body_style))

    story.append(Spacer(1, 14))

    # Page Break for Viva Section
    story.append(PageBreak())

    # Section 4: Viva & Interview Q&A
    story.append(Paragraph("4. Comprehensive Viva & Technical Interview Questions", h1_style))
    story.append(Paragraph("Prepare these exact answers for technical interviews and project viva defense:", body_style))
    story.append(Spacer(1, 6))

    viva_qa = [
        (
            "Q1: Why did you choose statistical anomaly detection (3-sigma) over fixed threshold alerting?",
            "Fixed thresholds (e.g., latency > 500ms) produce rampant false positives because microservices have varying normal baselines (an Auth service averages 50ms, while a Report generator takes 2000ms). By calculating rolling mean (μ) and standard deviation (σ), the system autonomously learns each service's baseline and alerts only on true anomalies (>= 3σ)."
        ),
        (
            "Q2: How does the system guarantee zero downtime if the external LLM API is unavailable?",
            "I built a resilient dual-engine architecture: when an Anthropic API key is configured, it leverages Claude 3.7 Sonnet for advanced synthesis. If the key is missing or the external API times out, it seamlessly falls back to an internal Heuristic Correlation Engine that parses error codes, stack traces, and deviation scores to output complete root-cause diagnostics without crashing."
        ),
        (
            "Q3: Explain the role and advantages of Prisma ORM in this architecture.",
            "Prisma provides end-to-end type safety, auto-generated migrations, and structured relationship queries. It maps Organizations, Users, Services, Metrics, Logs, and Incidents with referential integrity and indexes time-series fields (e.g. @@index([serviceId, timestamp])) for sub-millisecond query performance."
        ),
        (
            "Q4: How does DevSight AI ensure secure Multi-Tenancy and Access Control?",
            "Multi-tenancy is enforced at the database layer where all queries scope to req.user.organizationId verified via JWT tokens. Role-Based Access Control (RBAC) guards sensitive management actions (such as adding or deleting services) restricting them strictly to ADMIN and DEVOPS_ENGINEER roles."
        ),
        (
            "Q5: How does the Log Analyzer feature provide value to engineers?",
            "It provides dual functionality: 1) A live, searchable log browser with level-based filtering (INFO/WARN/ERROR), and 2) An on-demand AI Explainer where engineers can click 'Explain with AI' on any live error or paste custom stack traces to get an instant plain-English translation and remediation plan."
        ),
        (
            "Q6: How would you scale this architecture to ingest millions of metrics per second?",
            "I would introduce a distributed message broker (Apache Kafka or Redis Streams) in front of the ingest endpoint to buffer bursts, migrate metric storage to a specialized time-series database (TimescaleDB or ClickHouse), and decouple backend modules into dedicated microservices (Auth, Ingest, AI Analysis, Alerting)."
        )
    ]

    for q, a in viva_qa:
        story.append(Paragraph(q, qa_q_style))
        story.append(Paragraph(f"<b>Answer:</b> {a}", qa_a_style))

    story.append(Spacer(1, 10))

    # Section 5: Business Potential & Monetization
    story.append(Paragraph("5. Business Model & Startup Strategy", h1_style))
    story.append(Paragraph(
        "<b>Market Opportunity:</b> The global observability market exceeds $25 Billion. Traditional tools like Datadog and Dynatrace charge tens of thousands of dollars just to show graphs. DevSight AI's competitive edge is <b>autonomous diagnosis</b>—answering 'WHY' an incident happened rather than just showing charts.",
        body_style
    ))
    story.append(Spacer(1, 6))

    pricing_data = [
        [Paragraph("Plan Tier", table_header_style), Paragraph("Price", table_header_style), Paragraph("Target Customer", table_header_style), Paragraph("Features Included", table_header_style)],
        [
            Paragraph("<b>Starter</b>", table_cell_style),
            Paragraph("$29 / mo", table_cell_style),
            Paragraph("Early startups & indie developers", table_cell_style),
            Paragraph("Up to 5 services, 7-day metric retention, Slack alerts, 200 AI root cause reports/mo.", table_cell_style)
        ],
        [
            Paragraph("<b>Professional</b>", table_cell_style),
            Paragraph("$199 / mo", table_cell_style),
            Paragraph("Growth-stage SaaS companies", table_cell_style),
            Paragraph("Up to 25 services, 30-day retention, Slack + Teams + Email alerts, unlimited AI reports, full RBAC.", table_cell_style)
        ],
        [
            Paragraph("<b>Enterprise</b>", table_cell_style),
            Paragraph("Custom ($999+/mo)", table_cell_style),
            Paragraph("Large scale engineering orgs", table_cell_style),
            Paragraph("Unlimited services, 1-year retention, Prometheus/OTel connectors, SSO/SAML, dedicated LLM deployment.", table_cell_style)
        ],
    ]
    pricing_table = Table(pricing_data, colWidths=[80, 80, 140, 204])
    pricing_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(pricing_table)
    story.append(Spacer(1, 14))

    # Section 6: Key Highlights & Metrics
    story.append(Paragraph("6. Key Business Metrics & ROI for Customers", h1_style))
    roi_points = [
        "<b>70% Reduction in MTTR (Mean Time to Resolution):</b> Outage root causes diagnosed in 3 seconds instead of 45-minute triaging calls.",
        "<b>Eliminates Alert Fatigue:</b> Statistical 3σ anomaly detection filters out background noise, alerting only when genuine failures occur.",
        "<b>Zero On-Call Ramp-Up Time:</b> Junior developers can resolve incidents immediately because root causes and fixes are explained in plain English."
    ]
    for pt in roi_points:
        story.append(Paragraph(f"✓ {pt}", body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {filename}")

if __name__ == "__main__":
    output_path = os.path.join(r"C:\Users\user\Documents\devsight-ai", "DevSight_AI_Project_Guide.pdf")
    build_pdf(output_path)
