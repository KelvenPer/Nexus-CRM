# Nexus CRM

Monorepo do CRM multi-tenant/low-code Nexus, com Backend (FastAPI) e Frontend (Next.js).

## Estrutura
- `Backend/`: API FastAPI com multi-tenancy via Postgres (schemas), JWT stateless e RBAC.
- `Frontend/`: Interface Next.js/React para operar módulos (Vendas, Dados, Automação) e Estúdio SQL.
- `docs/`: scripts SQL e documentação de arquitetura.

## Como rodar

### Backend (FastAPI)
```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (Next.js)
```powershell
cd Frontend
npm install
npm run dev
```

## Recursos do MVP
- Multi-tenant por schema com `tenant_admin` e schemas de tenant clonados do `template_schema`.
- Autenticação JWT stateless; roles carregadas de `tenant_admin.user_roles`/`roles`.
- Estúdio SQL seguro (SELECT/CTE, LIMIT 100, escopo no schema do tenant).
- UI com módulos de Vendas e Dados; dashboards e widgets mockados.

## Próximos passos
- Evoluir persistência real (oportunidades/contatos) via repositórios AsyncSession.
- Expandir RBAC e aplicar `require_permission` em rotas sensíveis.
- Ampliar catálogo de objetos e índices práticos no template.
