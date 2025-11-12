 "use client";

 import React, { useEffect, useState } from "react";

 type SchemaBrowserProps = {
   onInsertReference: (identifier: string) => void;
   refreshKey?: number;
 };

 type SchemaResponse = {
   tabelasBase?: string[];
   objetosCustom?: string[];
 };

 export default function SchemaBrowser({
   onInsertReference,
   refreshKey,
 }: SchemaBrowserProps) {
   const [isLoading, setIsLoading] = useState(true);
   const [tabelasBaseList, setTabelasBaseList] = useState<string[]>([]);
   const [objetosCustomList, setObjetosCustomList] = useState<string[]>([]);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
     let isMounted = true;

     async function fetchSchemas() {
       setIsLoading(true);
       try {
         const response = await fetch("/api/v1/meta/schemas");
         if (!response.ok) {
           throw new Error(`Falha ao buscar schemas (${response.status})`);
         }
         const data: SchemaResponse = await response.json();
         if (!isMounted) return;
         setTabelasBaseList(data.tabelasBase ?? []);
         setObjetosCustomList(data.objetosCustom ?? []);
         setError(null);
       } catch (fetchError) {
         console.error(fetchError);
         if (isMounted) {
           setError("Nao foi possivel carregar os schemas.");
         }
       } finally {
         if (isMounted) {
           setIsLoading(false);
         }
       }
     }

     fetchSchemas();

     return () => {
       isMounted = false;
     };
   }, [refreshKey]);

   const groups = [
     {
       title: "TABELAS BASE",
       icon: "[T]",
       items: tabelasBaseList,
       count: tabelasBaseList.length,
     },
     {
       title: "OBJETOS CUSTOMIZADOS",
       icon: "[C]",
       items: objetosCustomList,
       count: objetosCustomList.length,
     },
   ];

   return (
     <aside className="schema-panel">
       <div className="schema-title">Explorador de Dados</div>
       {isLoading ? (
         <div className="spinner" aria-label="Buscando objetos e tabelas" />
       ) : error ? (
         <p className="muted">{error}</p>
       ) : (
         groups.map((group) => (
           <div key={group.title} className="schema-group">
             <div className="schema-header">
               <div className="schema-heading">
                 <span className="schema-icon" aria-hidden="true">
                   {group.icon}
                 </span>
                 <strong>{group.title}</strong>
               </div>
              <div className="schema-info">
                <span>{group.count}</span>
                <span className="schema-arrow" aria-hidden="true">
                  v
                </span>
              </div>
             </div>
             <ul>
               {group.items.map((item) => (
                 <li key={item}>
                   <button
                     type="button"
                     className="schema-item"
                     onClick={() => onInsertReference(item)}
                   >
                     {item}
                   </button>
                 </li>
               ))}
             </ul>
           </div>
         ))
       )}
     </aside>
   );
 }
