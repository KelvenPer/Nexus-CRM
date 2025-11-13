Golden Schema (Template) Setup in pgAdmin

- Database: create `nexus_crm_db` (docs/sql/00_create_database.sql) from postgres DB.
- Extensions + Schemas + Tables: inside `nexus_crm_db`, run in order:
  - `docs/sql/01_enable_extensions.sql`
  - `docs/sql/02_create_schemas.sql`
  - `docs/sql/03_tenant_admin_tables.sql`
  - `docs/sql/04_template_schema_tables.sql`
  - `docs/sql/05_clone_from_template.sql`

Provision First Tenant (Admin Playground)

- Register tenant and clone:
  - `INSERT INTO tenant_admin.tb_tenant (nome_empresa, schema_name) VALUES ('Nexus CRM HQ (Admin)', 'tenant_nexus_hq') RETURNING id;`
  - `SELECT tenant_admin.clone_from_template('tenant_nexus_hq');`
  - `INSERT INTO tenant_admin.tb_usuario (tenant_id, email, senha_hash, perfil) VALUES ('<TENANT_UUID>', 'admin@nexuscrm.com', '<hash>', 'SUPER_ADMIN');`

Backend Integration

- Use header `X-Tenant-ID: tenant_nexus_hq`.
- Backend should set `SET LOCAL search_path TO tenant_nexus_hq, tenant_admin;` per request.
