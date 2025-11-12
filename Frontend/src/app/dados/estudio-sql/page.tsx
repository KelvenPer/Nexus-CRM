 "use client";

 import { useCallback, useEffect, useRef, useState } from "react";
 import AppShell from "@/components/layout/AppShell";
 import ActionToolbar from "@/components/sql-studio/ActionToolbar";
 import SchemaBrowser from "@/components/sql-studio/SchemaBrowser";
 import SqlEditor from "@/components/sql-studio/SqlEditor";
 import ResultsPanel from "@/components/sql-studio/ResultsPanel";
 import MetadadosPanel, {
   MetadadosPayload,
   MetadadosPanelHandle,
 } from "@/components/sql-studio/MetadadosPanel";

 const queryLines = [
   "SELECT t1.id, t1.nome, t2.valor",
   "  FROM tb_omniato t1",
   "  JOIN tb_oportunidade t2 ON t2.ont_id = t1.id",
   " WHERE t2.status IN ('Aberta', 'Proposta')",
   "   AND t2.tenant_id = current_setting('app.current_tenant')::uuid",
   " ORDER BY t2.ultima_interacao DESC",
 ];

 const initialQuery = queryLines.join("\n");

 const submoduleFocus = [
   {
     title: "Estudio SQL",
     focus: "Low-Code / Engenharia de dados",
     description:
       "Executor SQL seguro e multi-tenant; transforma consultas complexas em Objetos Customizados que qualquer modulo pode consumir.",
     icon: "[S]",
     highlights: [
       "Editor SQL + arvore de bases e meta_objetos",
       "Validacao que bloqueia comandos proibidos (nao SELECT)",
       "Salva consultas como meta_objetos com nome amigavel",
     ],
   },
   {
     title: "Relatorios e BI",
     focus: "No-Code / Analise de negocios",
     description:
       "Dashboards dinamicos criados sobre os Objetos customizados; o usuario monta graficos arrastando campos sem saber SQL.",
     icon: "[B]",
     highlights: [
       "Escolhe qualquer objeto (base + custom) como fonte",
       "Cria graficos por eixo X/Y e agrega valores (soma/media)",
       "Agenda envios automaticos e alertas por KPI",
     ],
   },
   {
     title: "Metadados (Objetos)",
     focus: "Admin / Gerenciamento",
     description:
       "Catalogo centralizado com permissoes, colunas e integracoes; controla quem consome cada objeto e se APIs externas tem acesso.",
     icon: "[M]",
     highlights: [
       "Lista completa de meta_objetos com versionamento",
       "Define metadados por coluna (tipo, privacidade, alias)",
       "Configura acessos por perfis e expoe APIs com chaves",
     ],
   },
 ];

 export default function EstudioSQLPage() {
   const [sqlQuery, setSqlQuery] = useState(initialQuery);
   const [queryResult, setQueryResult] = useState<Record<string, unknown>[]>([]);
   const [executionTime, setExecutionTime] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [isQueryValid, setIsQueryValid] = useState(true);
   const [isTestSuccessful, setIsTestSuccessful] = useState(false);
   const [refreshSchemas, setRefreshSchemas] = useState(0);
   const metadataRef = useRef<MetadadosPanelHandle>(null);

   const handleInsertReference = useCallback((identifier: string) => {
     setSqlQuery((prev) => {
       const trimmed = prev.trimEnd();
       if (!trimmed) {
         return `${identifier} `;
       }
       return `${trimmed} ${identifier} `;
     });
   }, []);

   const handleValidationChange = useCallback((valid: boolean) => {
     setIsQueryValid(valid);
     if (!valid) {
       setIsTestSuccessful(false);
     }
   }, []);

   useEffect(() => {
     setIsTestSuccessful(false);
   }, [sqlQuery]);

   const handleTestQuery = useCallback(async () => {
     if (!isQueryValid) {
       return;
     }

     setIsLoading(true);
     setIsTestSuccessful(false);

     try {
       const response = await fetch("/api/v1/data/query/test", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ query: sqlQuery }),
       });

       if (!response.ok) {
         throw new Error(`Teste falhou (${response.status})`);
       }

       const data = await response.json();
       setQueryResult(Array.isArray(data.results) ? data.results : []);
       setExecutionTime(data.time ?? "");
       setIsTestSuccessful(true);
     } catch (error) {
       console.error(error);
       setQueryResult([]);
       setExecutionTime("");
     } finally {
       setIsLoading(false);
     }
   }, [isQueryValid, sqlQuery]);

   const handleClear = useCallback(() => {
     setSqlQuery("");
     setQueryResult([]);
     setExecutionTime("");
     setIsTestSuccessful(false);
   }, []);

   const handleSaveObject = useCallback(async (payload: MetadadosPayload) => {
     try {
       const response = await fetch("/api/v1/meta-objetos", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(payload),
       });

       if (!response.ok) {
         throw new Error(`Falha ao salvar (${response.status})`);
       }

       setRefreshSchemas((previous) => previous + 1);
     } catch (error) {
       console.error(error);
     }
   }, []);

   return (
     <AppShell>
       <div className="submodule-overview">
         <div>
           <p className="eyebrow">Area de Dados no Pilar Nexus</p>
           <h1>Centro de Low-Code e gestao de metadados</h1>
           <p className="muted">
             A Area de Dados e o coracao do Nexus CRM. O Estudio SQL entrega a
             engenharia de dados segura, os Relatorios e BI democratizam a analise
             e os Metadados mantem o catalogo sob controle.
           </p>
         </div>
         <div className="overview-cards">
           {submoduleFocus.map((module) => (
             <article key={module.title}>
               <header>
                 <span aria-hidden="true">{module.icon}</span>
                 <div>
                   <h3>{module.title}</h3>
                   <p>{module.focus}</p>
                 </div>
               </header>
               <p>{module.description}</p>
               <ul>
                 {module.highlights.map((item) => (
                   <li key={item}>{item}</li>
                 ))}
               </ul>
             </article>
           ))}
         </div>
       </div>

       <div className="data-area">
         <section className="data-header">
           <div>
             <div className="brand-label">
               <span role="img" aria-label="Nexus logo">
                 [N]
               </span>
               <span>NEXUS CRM</span>
             </div>
             <h1>Editor de Consulta SQL</h1>
             <p className="muted">
               Escreva, valide e salve consultas escoltadas pelo motor do Nexus CRM.
             </p>
           </div>
           <ActionToolbar
             onTestClick={handleTestQuery}
             onSaveClick={() => metadataRef.current?.submit()}
             onClearClick={handleClear}
             isQueryValid={isQueryValid}
             isTestSuccessful={isTestSuccessful}
             isLoading={isLoading}
           />
         </section>

         <div className="data-playground">
           <SchemaBrowser
             onInsertReference={handleInsertReference}
             refreshKey={refreshSchemas}
           />
           <SqlEditor
             sqlQuery={sqlQuery}
             setSqlQuery={setSqlQuery}
             executionTime={executionTime}
             onValidationChange={handleValidationChange}
           />
         </div>

         <div className="data-result">
           <ResultsPanel
             queryResult={queryResult}
             isLoading={isLoading}
             executionTime={executionTime}
           />
           <MetadadosPanel
             ref={metadataRef}
             sqlQuery={sqlQuery}
             isTestSuccessful={isTestSuccessful}
             onSaveClick={handleSaveObject}
           />
         </div>
       </div>
     </AppShell>
   );
 }
