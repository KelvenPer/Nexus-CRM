# Autenticação e Governança de Sessão — Nexus CRM

Este mapeamento consolida tudo o que já foi construído para garantir um login seguro, multi-tenant e alinhado ao Estúdio SQL.

---

## 1. Fluxo de Autenticação (FastAPI)

| Etapa | Endpoint | Implementação | Descrição |
| --- | --- | --- | --- |
| 1. Descobrir tenant/email | `POST /auth/check-email` | `Backend/app/api/routes/auth.py` | Localiza o usuário em `tenant_admin.tb_usuario`, retorna tenant/empresa/logo e habilita a segunda etapa do login. |
| 2. Validar senha e emitir token | `POST /auth/token` | `Backend/app/api/routes/auth.py` + `app/security/jwt_tenancy.py` | Verifica `senha_hash` com Passlib, gera JWT (`create_access_token`) contendo `user_id`, `tenant_id`, `perfil` e `roles`. |
| 3. Logout | `POST /auth/logout` | `Backend/app/api/routes/auth.py` | Invalida o token em memória (MVP) e será integrado a uma store/Redis futuro. |

## 2. Banco & Migrações

- **Schema central `tenant_admin`**: armazena `tb_tenant`, `tb_usuario`, `tb_meta_objeto`, `tb_meta_permissoes`.  
- **Schemas por tenant**: contêm `tb_contato`, `tb_oportunidade`, `tb_atividade` e demais tabelas de negócio.  
- **Provisionamento**: mapeado no arquivo `docs/sql/base_tables.sql`, usado como base para scripts Alembic/Terraform ao criar um novo cliente.  
- **`set_tenant_search_path` (`app/db/utils.py`)**: após autenticação, o backend define `search_path` para `<schema_do_tenant>, tenant_admin`, garantindo RLS adicional mesmo com schemas isolados.

## 3. JWT e Segurança

- **Criação**: `app/security/jwt_tenancy.py#create_access_token` utiliza `settings.secret_key`, `settings.jwt_algorithm` e `settings.access_token_expires_minutes`.  
- **Validação**: `validar_jwt_e_tenant` decodifica o token, busca o schema do tenant (`get_tenant_schema_by_id`) e aplica o `SET LOCAL search_path`, garantindo que consultas SQL só enxerguem os objetos do tenant.  
- **Perfis/Permissões**: `roles` emitidos no JWT alimentam `/api/v1/dados/meta-objetos/disponiveis`, que cruza o a lista de objetos com `tb_meta_permissoes`.

## 4. Frontend — Tela de Login (Next.js)

- **Etapa 1 (email)**: chama `/auth/check-email`. Em caso de sucesso, exibe tenant/logo, armazena `TenantInfo` em memória e libera o campo de senha.  
- **Etapa 2 (senha)**: envia e-mail + senha para `/auth/token`, recebe o `access_token` e salva em `localStorage` (chaves `nexus_token` e `nexus_user`).  
- **Redirecionamento**: após autenticar, o usuário é enviado para `/dados/estudio-sql`, levando no token os headers `X-Tenant-ID`, `X-User-ID` e `X-User-Roles` que o frontend usa para chamar as APIs.  
- **Utilidades**: `src/lib/auth.ts` centraliza chamadas/checks do login e pode ser reutilizado para validar sessões futuras (ex.: proteger rotas com middleware).

Com essas três camadas — banco preparado, JWT multi-tenant e UI de duas etapas — o Nexus CRM garante onboarding seguro desde o primeiro clique do usuário.
