 "use client";

 import dynamic from "next/dynamic";
 import React, { useCallback, useEffect, useMemo } from "react";

 const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
   ssr: false,
 });

 type SqlEditorProps = {
   sqlQuery: string;
   setSqlQuery: (value: string) => void;
   onValidationChange?: (isValid: boolean) => void;
   executionTime?: string;
 };

 type ValidationLevel = "idle" | "success" | "error";

 export default function SqlEditor({
   sqlQuery,
   setSqlQuery,
   onValidationChange,
   executionTime,
 }: SqlEditorProps) {
   const forbiddenRegex = useMemo(
     () => /\b(DROP|UPDATE|DELETE|ALTER)\b/i,
     []
   );

   const evaluation = useMemo(() => {
     const trimmed = sqlQuery.trim();
     const hasForbidden = forbiddenRegex.test(sqlQuery);

     if (!trimmed) {
       return {
         level: "idle" as ValidationLevel,
         message: "Digite uma consulta SQL para comecar.",
         isValid: false,
       };
     }

     if (hasForbidden) {
       return {
         level: "error" as ValidationLevel,
         message: "Comandos proibidos detectados!",
         isValid: false,
       };
     }

     return {
       level: "success" as ValidationLevel,
       message: "Consulta validada e pronta para execucao / salvamento.",
       isValid: true,
     };
   }, [forbiddenRegex, sqlQuery]);

   useEffect(() => {
     onValidationChange?.(evaluation.isValid);
   }, [evaluation.isValid, onValidationChange]);

   const handleEditorChange = useCallback(
     (value: string | undefined) => {
       setSqlQuery(value ?? "");
     },
     [setSqlQuery]
   );

   const validationClass =
     evaluation.level === "error" ? "query-alert warning" : "query-status success";

   return (
     <section className="query-panel">
       <header className="query-header">
         <div>
           <p className="eyebrow">
             Regular a consulta{" "}
             {executionTime ? `(Tempo: ${executionTime})` : "(Tempo em standby)"}
           </p>
           <h2>Editor de Consulta SQL</h2>
         </div>
         <span className="badge">SQL</span>
       </header>
       <div className="query-editor">
         <MonacoEditor
           height="100%"
           defaultLanguage="sql"
           language="sql"
           value={sqlQuery}
           onChange={handleEditorChange}
           theme="vs-dark"
           options={{
             minimap: { enabled: false },
             wordWrap: "on",
             fontSize: 14,
             fontFamily: '"IBM Plex Mono", "Source Code Pro", monospace',
             tabSize: 2,
             lineNumbers: "on",
           }}
         />
       </div>
       <div className="query-footer">
         <div className="query-state">
           <div className={validationClass}>{evaluation.message}</div>
         </div>
         <div className="tag-group">
           <span className="ghost-tag">DEFINIR NOME LEGIVEL</span>
           <span className="ghost-tag">APLICAR FILTROS</span>
         </div>
       </div>
     </section>
   );
 }
