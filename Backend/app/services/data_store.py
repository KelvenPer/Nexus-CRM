"""In-memory, per-tenant data store used during the MVP."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
import secrets
from typing import Dict, List, Optional
from uuid import uuid4

from app.models import (
    AccountCreate,
    AccountResponse,
    ActivityItem,
    AutomationTriggerCreate,
    AutomationTriggerResponse,
    CampaignCreate,
    CampaignResponse,
    ContactCreate,
    ContactResponse,
    DashboardSaveRequest,
    EmailTemplateCreate,
    EmailTemplateResponse,
    LeadCreate,
    LeadResponse,
    MetaObjectCreate,
    MetaObjectResponse,
    OpportunityCreate,
    OpportunityResponse,
    ProductCreate,
    ProductResponse,
    SegmentCreate,
    SegmentResponse,
    SupportTicket,
    TokenResponse,
    TradeVisit,
    UserProfile,
    WidgetPayload,
    WorkflowCreate,
    WorkflowResponse,
    WorkflowRunResponse,
)


DEFAULT_PROFILES: List[UserProfile] = [
    UserProfile(id="vendas", name="Vendas"),
    UserProfile(id="marketing", name="Marketing"),
    UserProfile(id="diretoria", name="Diretoria"),
    UserProfile(id="trade", name="Trade Marketing"),
]

BASE_TABLES = [
    "tb_oportunidade",
    "tb_contato",
    "tb_trade_marketing_visitas",
    "tb_campanha",
    "tb_segmento",
]


@dataclass
class MetaObjectRecord:
    meta_id: str
    payload: MetaObjectResponse

    def to_response(self) -> MetaObjectResponse:
        return self.payload


@dataclass
class WidgetRecord:
    widget_id: str
    dashboard_id: str
    payload: WidgetPayload

    def to_payload(self) -> WidgetPayload:
        return self.payload


@dataclass
class DashboardRecord:
    dashboard_id: str
    name: str
    layout: List[dict] = field(default_factory=list)
    widgets: Dict[str, WidgetRecord] = field(default_factory=dict)

    def to_response(self) -> DashboardSaveRequest:
        return DashboardSaveRequest(
            id=self.dashboard_id,
            name=self.name,
            layout=self.layout,
            widgets=[widget.payload for widget in self.widgets.values()],
        )


class TenantMemoryStore:
    def __init__(self) -> None:
        self.meta_objects: Dict[str, MetaObjectRecord] = {}
        self.dashboards: Dict[str, DashboardRecord] = {}
        self.widgets: Dict[str, WidgetRecord] = {}
        self.available_profiles = DEFAULT_PROFILES.copy()
        self.leads: Dict[str, LeadResponse] = {}
        self.opportunities: Dict[str, OpportunityResponse] = {}
        self.accounts: Dict[str, AccountResponse] = {}
        self.contacts: Dict[str, ContactResponse] = {}
        self.campaigns: Dict[str, CampaignResponse] = {}
        self.segments: Dict[str, SegmentResponse] = {}
        self.activities: List[ActivityItem] = []
        self.products: Dict[str, ProductResponse] = {}
        self.trade_visits: List[TradeVisit] = []
        self.support_tickets: List[SupportTicket] = []
        self.workflows: Dict[str, WorkflowResponse] = {}
        self.triggers: Dict[str, AutomationTriggerResponse] = {}
        self.email_templates: Dict[str, EmailTemplateResponse] = {}

    # Meta objetos -----------------------------------------------------
    def list_meta_objects(self) -> List[MetaObjectResponse]:
        return [record.to_response() for record in self.meta_objects.values()]

    def list_meta_objects_for_roles(self, role_ids: List[str]) -> List[MetaObjectResponse]:
        if not role_ids:
            return []
        normalized = {role.lower() for role in role_ids}
        allowed: List[MetaObjectResponse] = []
        for record in self.meta_objects.values():
            if not record.payload.profiles:
                continue
            profile_ids = {profile.id.lower() for profile in record.payload.profiles}
            if normalized.intersection(profile_ids):
                allowed.append(record.to_response())
        return allowed

    def create_meta_object(self, payload: MetaObjectCreate) -> MetaObjectResponse:
        meta_id = str(uuid4())
        response = MetaObjectResponse(
            metaId=meta_id,
            nomeAmigavel=payload.nomeAmigavel,
            idObjeto=payload.idObjeto,
            tipo=payload.tipo,
            status=payload.status,
            descricao=payload.descricao,
            profiles=[],
            fields=payload.fields,
        )
        self.meta_objects[meta_id] = MetaObjectRecord(meta_id=meta_id, payload=response)
        return response

    def update_permissions(self, meta_id: str, profile_ids: List[str]) -> MetaObjectResponse:
        if meta_id not in self.meta_objects:
            raise KeyError(meta_id)
        profiles = [profile for profile in self.available_profiles if profile.id in profile_ids]
        record = self.meta_objects[meta_id]
        record.payload.profiles = profiles
        return record.payload

    # Widgets / Dashboards ---------------------------------------------
    def list_dashboards(self) -> List[DashboardSaveRequest]:
        return [dashboard.to_response() for dashboard in self.dashboards.values()]

    def get_dashboard(self, dashboard_id: str) -> DashboardSaveRequest | None:
        dashboard = self.dashboards.get(dashboard_id)
        return dashboard.to_response() if dashboard else None

    def save_dashboard(self, payload: DashboardSaveRequest) -> DashboardSaveRequest:
        dashboard_id = payload.id or str(uuid4())
        dashboard = self.dashboards.get(
            dashboard_id,
            DashboardRecord(dashboard_id=dashboard_id, name=payload.name, layout=payload.layout or []),
        )

        # Replace widgets for this dashboard
        dashboard.widgets = {}
        for widget in payload.widgets:
            widget_id = widget.id or str(uuid4())
            widget.id = widget_id
            record = WidgetRecord(widget_id=widget_id, dashboard_id=dashboard_id, payload=widget)
            dashboard.widgets[widget_id] = record
            self.widgets[widget_id] = record

        dashboard.name = payload.name
        dashboard.layout = payload.layout or []
        self.dashboards[dashboard_id] = dashboard
        return dashboard.to_response()

    def list_widgets_for_target(self, target: str) -> List[WidgetPayload]:
        return [
            record.to_payload()
            for record in self.widgets.values()
            if target in record.payload.publishTargets
        ]

    # Sales data -------------------------------------------------------
    def list_leads(self) -> List[LeadResponse]:
        return list(self.leads.values())

    def create_lead(self, payload: LeadCreate) -> LeadResponse:
        lead_id = str(uuid4())
        lead = LeadResponse(id=lead_id, createdAt=datetime.utcnow(), **payload.model_dump())
        self.leads[lead_id] = lead
        return lead

    def get_lead(self, lead_id: str) -> LeadResponse:
        if lead_id not in self.leads:
            raise KeyError(lead_id)
        return self.leads[lead_id]

    def update_lead(self, lead_id: str, payload: LeadCreate) -> LeadResponse:
        lead = self.get_lead(lead_id)
        updated = lead.model_copy(update=payload.model_dump())
        self.leads[lead_id] = updated
        return updated

    def delete_lead(self, lead_id: str) -> None:
        if lead_id not in self.leads:
            raise KeyError(lead_id)
        del self.leads[lead_id]

    def list_opportunities(self) -> List[OpportunityResponse]:
        return list(self.opportunities.values())

    def create_opportunity(self, payload: OpportunityCreate) -> OpportunityResponse:
        op_id = str(uuid4())
        opportunity = OpportunityResponse(
            id=op_id,
            updatedAt=datetime.utcnow(),
            **payload.model_dump(),
        )
        self.opportunities[op_id] = opportunity
        return opportunity

    def get_opportunity(self, op_id: str) -> OpportunityResponse:
        if op_id not in self.opportunities:
            raise KeyError(op_id)
        return self.opportunities[op_id]

    def update_opportunity(self, op_id: str, payload: OpportunityCreate) -> OpportunityResponse:
        opportunity = self.get_opportunity(op_id)
        updated = opportunity.model_copy(update={**payload.model_dump(), "updatedAt": datetime.utcnow()})
        self.opportunities[op_id] = updated
        return updated

    def delete_opportunity(self, op_id: str) -> None:
        if op_id not in self.opportunities:
            raise KeyError(op_id)
        del self.opportunities[op_id]

    def list_accounts(self) -> List[AccountResponse]:
        return list(self.accounts.values())

    def create_account(self, payload: AccountCreate) -> AccountResponse:
        account_id = str(uuid4())
        account = AccountResponse(id=account_id, **payload.model_dump())
        self.accounts[account_id] = account
        return account

    def list_contacts(self) -> List[ContactResponse]:
        return list(self.contacts.values())

    def create_contact(self, payload: ContactCreate) -> ContactResponse:
        contact_id = str(uuid4())
        contact = ContactResponse(id=contact_id, **payload.model_dump())
        self.contacts[contact_id] = contact
        return contact

    # Product catalog -------------------------------------------------
    def list_products(self) -> List[ProductResponse]:
        return list(self.products.values())

    def create_product(self, payload: ProductCreate) -> ProductResponse:
        product_id = str(uuid4())
        product = ProductResponse(id=product_id, **payload.model_dump())
        self.products[product_id] = product
        return product

    # Marketing data ---------------------------------------------------
    def list_campaigns(self) -> List[CampaignResponse]:
        return list(self.campaigns.values())

    def create_campaign(self, payload: CampaignCreate) -> CampaignResponse:
        campaign_id = str(uuid4())
        campaign = CampaignResponse(id=campaign_id, **payload.model_dump())
        self.campaigns[campaign_id] = campaign
        return campaign

    def list_segments(self) -> List[SegmentResponse]:
        return list(self.segments.values())

    def create_segment(self, payload: SegmentCreate) -> SegmentResponse:
        segment_id = str(uuid4())
        segment = SegmentResponse(id=segment_id, **payload.model_dump())
        self.segments[segment_id] = segment
        return segment

    # Solucoes (Trade Marketing / Atendimento) -----------------------
    def list_trade_visits(self) -> List[TradeVisit]:
        return self.trade_visits

    def add_trade_visit(self, visit: TradeVisit) -> None:
        self.trade_visits.append(visit)

    def list_support_tickets(self) -> List[SupportTicket]:
        return self.support_tickets

    def add_support_ticket(self, ticket: SupportTicket) -> None:
        self.support_tickets.append(ticket)

    # Automacao -------------------------------------------------------
    def list_workflows(self) -> List[WorkflowResponse]:
        return list(self.workflows.values())

    def save_workflow(self, payload: WorkflowCreate) -> WorkflowResponse:
        workflow_id = str(uuid4())
        workflow = WorkflowResponse(id=workflow_id, ultimaExecucao=None, **payload.model_dump())
        self.workflows[workflow_id] = workflow
        return workflow

    def trigger_workflow(self, workflow_id: str) -> WorkflowRunResponse:
        if workflow_id not in self.workflows:
            raise KeyError(workflow_id)
        triggered_at = datetime.utcnow()
        workflow = self.workflows[workflow_id]
        workflow.ultimaExecucao = triggered_at
        return WorkflowRunResponse(workflowId=workflow_id, status="triggered", triggeredAt=triggered_at)

    def list_triggers(self) -> List[AutomationTriggerResponse]:
        return list(self.triggers.values())

    def create_trigger(self, payload: AutomationTriggerCreate) -> AutomationTriggerResponse:
        trigger_id = str(uuid4())
        trigger = AutomationTriggerResponse(id=trigger_id, **payload.model_dump())
        self.triggers[trigger_id] = trigger
        return trigger

    def list_email_templates(self) -> List[EmailTemplateResponse]:
        return list(self.email_templates.values())

    def create_email_template(self, payload: EmailTemplateCreate) -> EmailTemplateResponse:
        template_id = str(uuid4())
        template = EmailTemplateResponse(
            id=template_id,
            ultimaAtualizacao=datetime.utcnow(),
            **payload.model_dump(),
        )
        self.email_templates[template_id] = template
        return template

    # Inicio dashboard -------------------------------------------------
    def list_activities(self) -> List[ActivityItem]:
        return self.activities

    def add_activity(self, activity: ActivityItem) -> None:
        self.activities.append(activity)

    def list_reminders(self) -> List[dict[str, str]]:
        reminders: List[dict[str, str]] = []
        now = datetime.utcnow()
        for activity in self.activities:
            urgency = "Alto" if activity.dueDate <= now + timedelta(days=1) else "Normal"
            reminders.append(
                {
                    "id": activity.id,
                    "title": activity.action,
                    "customer": activity.customer,
                    "dueDate": activity.dueDate.isoformat(),
                    "status": activity.status,
                    "badge": activity.badge,
                    "urgency": urgency,
                }
            )
        reminders.sort(key=lambda item: item["dueDate"])
        return reminders


class DataStore:
    """Keeps a TenantMemoryStore per tenant_id."""

    def __init__(self) -> None:
        self._stores: Dict[str, TenantMemoryStore] = {}
        self._auth_users: Dict[str, TenantUser] = {}
        self._active_tokens: Dict[str, TenantUser] = {}

    def get_store(self, tenant_id: str) -> TenantMemoryStore:
        if tenant_id not in self._stores:
            self._stores[tenant_id] = TenantMemoryStore()
            self._seed_defaults(self._stores[tenant_id])
        return self._stores[tenant_id]

    def _seed_defaults(self, store: TenantMemoryStore) -> None:
        # Seed a few meta objects so the UI is populated.
        defaults = [
            MetaObjectCreate(
                idObjeto="tb_oportunidade",
                nomeAmigavel="Oportunidades (Base)",
                tipo="BASE",
                status="Ativo",
                descricao="Tabela base de oportunidades.",
                fields=["ID", "NOME", "STATUS", "VALOR"],
            ),
            MetaObjectCreate(
                idObjeto="obj_vendas_campanha",
                nomeAmigavel="Vendas por Campanha",
                tipo="CUSTOMIZADO",
                status="Ativo",
                descricao="Objeto criado no Estudio SQL unindo vendas e campanhas.",
                fields=["CAMPANHA_NOME", "VALOR_ESTIMADO"],
            ),
        ]
        for meta in defaults:
            record = store.create_meta_object(meta)
            store.update_permissions(record.metaId, [profile.id for profile in DEFAULT_PROFILES])

        # Simulate an initial widget so the containers render something
        initial_widget = WidgetPayload(
            id=str(uuid4()),
            title="Vendas por Campanha",
            chartType="bar",
            objectId="obj_vendas_campanha",
            objectLabel="Vendas por Campanha",
            groupBy="campanha",
            aggregate="SUM",
            aggregateField="valor",
            data=[
                {"campanha": "Natal", "valor": 52000},
                {"campanha": "Black Friday", "valor": 87000},
                {"campanha": "Lancamento Q4", "valor": 34000},
            ],
            publishTargets=["DASHBOARD_INICIO", "MOD_VENDAS"],
        )
        dashboard = DashboardSaveRequest(id=str(uuid4()), name="Painel Comercial", widgets=[initial_widget])
        store.save_dashboard(dashboard)

        # Sales seed data
        store.create_lead(
            LeadCreate(
                nome="Luana Ribeiro",
                email="luana@superlima.com",
                status="Novo",
                origem="Inbound",
                owner="Aline Husni",
            )
        )
        store.create_lead(
            LeadCreate(
                nome="Carlos Mendes",
                email="carlos@clinicmais.com",
                status="Qualificado",
                origem="Evento",
                owner="Carlos Nogueira",
            )
        )

        store.create_opportunity(
            OpportunityCreate(
                nome="Supermercado Lima",
                stage="Propostas",
                valor=52000,
                probabilidade=0.62,
                owner="Aline Husni",
            )
        )
        store.create_opportunity(
            OpportunityCreate(
                nome="Rede Clinic+",
                stage="Negociacao",
                valor=35000,
                probabilidade=0.55,
                owner="Carlos Nogueira",
            )
        )
        store.create_opportunity(
            OpportunityCreate(
                nome="Grupo Aurora",
                stage="Demonstracao",
                valor=19000,
                probabilidade=0.45,
                owner="Patricia Sampaio",
            )
        )

        store.create_account(
            AccountCreate(nome="Supermercado Lima", segmento="Varejo", cidade="Fortaleza", estado="CE")
        )
        store.create_account(
            AccountCreate(nome="Rede Clinic+", segmento="Saude", cidade="Curitiba", estado="PR")
        )

        store.create_contact(
            ContactCreate(nome="Marina Torres", email="marina@superlima.com", telefone="(85) 98888-1122", conta="Supermercado Lima")
        )
        store.create_contact(
            ContactCreate(nome="Roberto Dias", email="rdias@clinicmais.com", telefone="(41) 97777-4411", conta="Rede Clinic+")
        )

        store.create_product(
            ProductCreate(
                sku="SKU-CRM-001",
                nome="Modulo Field Sales",
                categoria="Software",
                preco=1990.0,
                margem=0.42,
                disponibilidade="Disponivel",
                descricao="Pacote de licencas com roteirizacao e checklists.",
            )
        )
        store.create_product(
            ProductCreate(
                sku="SKU-CRM-014",
                nome="Kit Trade Marketing",
                categoria="Servicos",
                preco=7200.0,
                margem=0.55,
                disponibilidade="Backorder",
                descricao="Time dedicado para execucao de campanhas em loja.",
            )
        )

        store.create_campaign(
            CampaignCreate(
                nome="Black Friday 2025",
                status="Ativa",
                investimento=87000,
                inicio="2025-11-01",
                fim="2025-11-30",
            )
        )
        store.create_campaign(
            CampaignCreate(
                nome="Lançamento Q4",
                status="Planejada",
                investimento=34000,
                inicio="2025-12-05",
                fim="2026-01-05",
            )
        )

        store.create_segment(
            SegmentCreate(nome="Clientes VIP", regra="Ticket > R$ 40k nos ultimos 90 dias", tamanho=42)
        )
        store.create_segment(
            SegmentCreate(nome="Segmento Nordeste", regra="Contas da regiao Nordeste", tamanho=185)
        )

        now = datetime.utcnow()
        store.add_activity(
            ActivityItem(
                id=str(uuid4()),
                customer="Supermercado Lima",
                action="Enviar proposta Platinum",
                status="Em andamento",
                badge="Pipeline",
                dueDate=now + timedelta(days=1),
            )
        )
        store.add_activity(
            ActivityItem(
                id=str(uuid4()),
                customer="Rede Clinic+",
                action="Agendar follow-up",
                status="Aguardando cliente",
                badge="Agenda",
                dueDate=now + timedelta(days=2),
            )
        )
        store.add_activity(
            ActivityItem(
                id=str(uuid4()),
                customer="Grupo Aurora",
                action="Revisar metas do trimestre",
                status="Planejado",
                badge="Estrategia",
                dueDate=now + timedelta(days=3),
            )
        )

        store.add_trade_visit(
            TradeVisit(
                id=str(uuid4()),
                cliente="Rede Norte Atacado",
                canal="Cash&Carry",
                objetivo="Auditar ponta extra",
                status="Concluido",
                responsavel="Bruna Azevedo",
                proximaAcao="Enviar relatorio com fotos",
                data=now - timedelta(days=1),
            )
        )
        store.add_trade_visit(
            TradeVisit(
                id=str(uuid4()),
                cliente="Supermercado Lima",
                canal="Varejo",
                objetivo="Ativar degustacao premium",
                status="Em andamento",
                responsavel="Lucas Porto",
                proximaAcao="Confirmar equipe de promotoras",
                data=now + timedelta(days=2),
            )
        )

        store.add_support_ticket(
            SupportTicket(
                id=str(uuid4()),
                cliente="Rede Clinic+",
                canal="E-mail",
                assunto="Integracao BI travada",
                prioridade="Alta",
                status="Aberto",
                owner="Time Atendimento",
                sla="4h",
            )
        )
        store.add_support_ticket(
            SupportTicket(
                id=str(uuid4()),
                cliente="Supermercado Lima",
                canal="Portal",
                assunto="Erro ao sincronizar contas",
                prioridade="Media",
                status="Em progresso",
                owner="CS Aline",
                sla="8h",
            )
        )

        store.save_workflow(
            WorkflowCreate(
                nome="Onboarding de Leads Enterprise",
                descricao="Cria tarefa para SDR e envia e-mail automatizado.",
                status="Ativo",
            )
        )
        store.save_workflow(
            WorkflowCreate(
                nome="Reengajar oportunidades congeladas",
                descricao="Dispara alerta para gestor apos 30 dias sem movimentacao.",
                status="Ativo",
            )
        )

        store.create_trigger(
            AutomationTriggerCreate(
                nome="Lead com ticket > 50k",
                objeto="Lead",
                condicao="valor_estimado > 50000",
                acao="Notificar Diretoria",
                status="Ativo",
            )
        )
        store.create_trigger(
            AutomationTriggerCreate(
                nome="Campanha com CPA acima do teto",
                objeto="Campanha",
                condicao="cpa > 120",
                acao="Pausar automacao",
                status="Monitorando",
            )
        )

        store.create_email_template(
            EmailTemplateCreate(
                nome="Follow-up Padrao",
                assunto="Seguimos com a proposta, {{contato}}?",
                owner="Marketing Ops",
                status="Ativo",
                conteudo="Ola {{contato}}, passando para saber se conseguiu revisar nossa proposta.",
            )
        )
        store.create_email_template(
            EmailTemplateCreate(
                nome="Alerta de renovacao",
                assunto="Sua renovacao Nexus CRM vence em 30 dias",
                owner="Customer Success",
                status="Rascunho",
                conteudo="Ola {{cliente}}, segue briefing da renovacao e condicoes especiais.",
            )
        )

        tenant_logo = "https://raw.githubusercontent.com/kelver/NexusCRM/main/public/logo.png"
        self.register_user(
            TenantUser(
                email="aline@nexuscrm.com",
                name="Aline Husni",
                password="nexus123",
                tenant_id="tenant_demo",
                tenant_name="Supermercado Lima",
                tenant_logo_url=tenant_logo,
                roles=["user", "data_admin"],
            )
        )

    # ------------------------------------------------------------------
    # Auth directory
    # ------------------------------------------------------------------

    def register_user(self, user: TenantUser) -> None:
        self._auth_users[user.email.lower()] = user

    def find_user_by_email(self, email: str) -> Optional[TenantUser]:
        return self._auth_users.get(email.lower())

    def generate_token(self, user: TenantUser) -> str:
        token = secrets.token_urlsafe(32)
        self._active_tokens[token] = user
        return token

    def validate_credentials(self, email: str, password: str) -> Optional[TenantUser]:
        user = self.find_user_by_email(email)
        if user and user.password == password:
            return user
        return None

    def invalidate_token(self, token: str) -> None:
        self._active_tokens.pop(token, None)


data_store = DataStore()
@dataclass
class TenantUser:
    email: str
    name: str
    password: str
    tenant_id: str
    tenant_name: str
    tenant_logo_url: Optional[str]
    roles: List[str]

    def to_check_email_payload(self) -> dict:
        return {
            "email": self.email,
            "userName": self.name,
            "tenantId": self.tenant_id,
            "tenantName": self.tenant_name,
            "tenantLogoUrl": self.tenant_logo_url,
        }
