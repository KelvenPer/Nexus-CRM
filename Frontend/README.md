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
