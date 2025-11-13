# Nexus CRM Backend

FastAPI service que sustentara o motor multi-tenant/low-code do Nexus CRM.

## Como comecar

1. Crie um ambiente virtual:
   ```powershell
   python -m venv .venv
   .\\.venv\\Scripts\\Activate.ps1
   ```
2. Instale as dependencias:
   ```powershell
   pip install -r requirements.txt
   ```
3. Copie .env.example para .env e ajuste as variaveis.
4. Rode o servidor:
   ```powershell
   uvicorn app.main:app --reload
   ```

## Proximos passos
- Adicionar camada de autenticacao (JWT) e extracao de tenant_id a cada requisicao.
- Implementar camada de metadados (meta_objetos) no schema tenant_admin.
- Criar comandos/migrations que provisionem novos schemas por tenant.

## Banco de dados: Golden Schema (pgAdmin)

1) Criar DB (rodar fora do DB alvo):
- docs/sql/00_create_database.sql

2) Dentro de `nexus_crm_db`, rodar na ordem:
- docs/sql/01_enable_extensions.sql
- docs/sql/02_create_schemas.sql
- docs/sql/03_tenant_admin_tables.sql
- docs/sql/04_template_schema_tables.sql
- docs/sql/05_clone_from_template.sql

3) Provisionar seu primeiro tenant (Playground Admin):
- Via SQL (pgAdmin):
  - Registrar tenant: `INSERT INTO tenant_admin.tb_tenant (nome_empresa, schema_name) VALUES ('Nexus CRM HQ (Admin)', 'tenant_nexus_hq') RETURNING id;`
  - Criar schema: `CREATE SCHEMA IF NOT EXISTS tenant_nexus_hq;`
  - Clonar tabelas: `SELECT tenant_admin.clone_from_template('tenant_nexus_hq');`
  - Criar SUPER_ADMIN: `INSERT INTO tenant_admin.tb_usuario (tenant_id, email, senha_hash, perfil) VALUES ('<TENANT_UUID>', 'admin@nexuscrm.com', '<hash>', 'SUPER_ADMIN');`

- Via script Python (opcional):
  ```powershell
  cd Backend
  python -m venv .venv
  .\\.venv\\Scripts\\Activate.ps1
  pip install -r requirements.txt
  # Ajuste DATABASE_URL em app/core/config.py ou via .env
  python -m app.ops.provision_tenant --company "Nexus CRM HQ (Admin)" --schema tenant_nexus_hq --admin-email admin@nexuscrm.com --password <hash>
  ```

4) search_path (execucao das APIs):
- O backend deve executar `SET LOCAL search_path TO <schema_do_tenant>, tenant_admin;` por requisicao.
- Na fase atual (MVP), use o header `X-Tenant-ID` igual ao nome do schema (ex.: `tenant_nexus_hq`).
