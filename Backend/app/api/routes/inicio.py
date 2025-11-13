from collections import defaultdict

from fastapi import APIRouter, Depends

from app.core.security import TenantContext, get_tenant_context
from app.models import DashboardSummary, FunnelStage, KPIItem
from app.services import data_store

router = APIRouter()


def _format_currency(value: float) -> str:
    return f"R$ {value:,.0f}".replace(",", "X").replace(".", ",").replace("X", ".")


@router.get(
    "/dashboard/kpis",
    summary="Get main dashboard KPIs",
    response_model=DashboardSummary,
)
async def get_dashboard_kpis(context: TenantContext = Depends(get_tenant_context)) -> DashboardSummary:
    store = data_store.get_store(context.tenant_id)
    opportunities = store.list_opportunities()
    leads = store.list_leads()
    activities = store.list_activities()

    receita_prevista = sum(op.valor for op in opportunities)
    oportunidades_total = len(opportunities)
    atividades_abertas = len([act for act in activities if act.status.lower() != "concluido"])

    kpi_cards = [
        KPIItem(label="Receita prevista", value=_format_currency(receita_prevista), change="+14% vs meta"),
        KPIItem(label="Atividades em aberto", value=str(atividades_abertas), change="3 novas reunioes"),
        KPIItem(label="Leads ativos", value=str(len(leads)), change="+5 no ultimo ciclo"),
    ]

    stage_totals: dict[str, dict[str, float]] = defaultdict(lambda: {"valor": 0.0, "count": 0})
    for opportunity in opportunities:
        stage = opportunity.stage
        stage_totals[stage]["valor"] += opportunity.valor
        stage_totals[stage]["count"] += 1

    funnel_stages: list[FunnelStage] = []
    for index, (stage, totals) in enumerate(stage_totals.items()):
        amount = _format_currency(totals["valor"])
        progress = min(1.0, (totals["valor"] / receita_prevista) if receita_prevista else 0.25)
        accent_palette = ["#00bcd4", "#8bc34a", "#ffc107", "#1a7cb7"]
        funnel_stages.append(
            FunnelStage(
                title=stage,
                amount=amount,
                items=int(totals["count"]),
                progress=float(progress),
                accent=accent_palette[index % len(accent_palette)],
            )
        )

    if not funnel_stages:
        funnel_stages = [
            FunnelStage(title="Prospects", amount="R$ 0", items=0, progress=0.25, accent="#00bcd4"),
            FunnelStage(title="Qualificacao", amount="R$ 0", items=0, progress=0.25, accent="#8bc34a"),
        ]

    activity_cards = [
        {"customer": act.customer, "action": act.action, "status": act.status, "badge": act.badge}
        for act in activities
    ]

    return DashboardSummary(kpiCards=kpi_cards, funnelStages=funnel_stages, activities=activity_cards)


@router.get("/atividades", summary="List user's activities")
async def get_user_activities(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return {"items": [activity.model_dump() for activity in store.list_activities()]}


@router.get("/calendario", summary="List calendar activities")
async def get_calendar_activities(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    events = [
        {
            "title": activity.action,
            "customer": activity.customer,
            "status": activity.status,
            "date": activity.dueDate.isoformat(),
        }
        for activity in store.list_activities()
    ]
    return {"events": events}


@router.get("/lembretes", summary="List reminders based on activities")
async def get_reminders(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return {"items": store.list_reminders()}
