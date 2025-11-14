"""Reporting configuration constants."""

REPORT_TYPES = {
    "executive_summary": {
        "name": "Relatorio Executivo",
        "description": "Visao resumida para diretoria",
        "sections": ["executive_summary", "kpi_overview", "insights", "recommendations"],
        "max_pages": 10,
    },
    "detailed_analysis": {
        "name": "Analise Detalhada",
        "description": "Analise tecnica completa",
        "sections": ["executive_summary", "financial_analysis", "proof_gallery", "performance_breakdown"],
        "max_pages": 40,
    },
    "proof_compliance": {
        "name": "Relatorio de Conformidade",
        "description": "Foco nas comprovacoes",
        "sections": ["contract_summary", "proof_status", "issues_found"],
        "max_pages": 25,
    },
}

BRANDING = {
    "company": "Nexus CRM",
    "logo_path": "assets/brand/logo.png",
    "primary_color": "#2563eb",
    "secondary_color": "#64748b",
}

PDF_CONFIG = {
    "page_size": "A4",
    "margins": {"top": 36, "bottom": 36, "left": 36, "right": 36},
}
