<<<<<<< HEAD
# Nexus CRM Frontend

Interface Next.js/React que demonstra o console Low-Code multi-tenant descrito no MVP. O layout atual ja contempla:

- Sidebar com modulos de Vendas e Dados.
- GenericDataTable que exibira qualquer objeto retornado pela API.
- Playground onde o Tenant Admin envia SQL seguro para criar novos visores (meta_objetos).

## Scripts uteis

```
npm install       # instala dependencias
npm run dev       # inicia http://localhost:3000
npm run lint      # checa padroes do Next/ESLint
```

## Proximos passos
- Integrar o componente GenericDataTable com o endpoint /api/meta-object/{id} (FastAPI).
- Conectar o SqlPlaygroundForm ao backend para validar consultas e persistir meta_objetos.
- Adicionar autenticacao por tenant e estados reais (loading, erro etc.).
=======
# Nexus CRM

Monorepo inicial do CRM multi-tenant/low-code Nexus. Ele contem:

- Backend/: API FastAPI pronta para receber o motor de multi-tenancy e metadados.
- Frontend/: Interface Next.js para visualizar objetos dinamicos e operar o playground SQL.
- docs/visao-mapeamento.md: transcricao completa da conversa estrategica que guia o MVP.

## Como rodar

### Backend (FastAPI)
```powershell
cd Backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (Next.js)
```powershell
cd Frontend
npm install
npm run dev
```

## Proximos marcos
1. Provisionamento de schemas + camada JWT vinculada ao tenant_id.
2. Executor SQL seguro (SELECT only) com catalogo meta_objetos.
3. Integracao interface-backend exibindo tabelas e salvando novos visores.
>>>>>>> 1df65ad6431357128061643b01f28d5420770948
