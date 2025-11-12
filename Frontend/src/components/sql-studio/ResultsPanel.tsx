 "use client";

 import React from "react";

 type ResultsPanelProps = {
   queryResult: Record<string, unknown>[];
   isLoading: boolean;
   executionTime?: string;
 };

 export default function ResultsPanel({
   queryResult,
   isLoading,
   executionTime,
 }: ResultsPanelProps) {
   const columns = queryResult.length ? Object.keys(queryResult[0]) : [];

   return (
     <section className="result-panel">
       <div className="panel-header">
         <div>
           <p className="eyebrow">Area de Resultado</p>
           <h3>Resultado da consulta</h3>
         </div>
         <span className="badge success">
           Tempo: {executionTime ?? "-"}
         </span>
       </div>
       <div className="result-status">
         Tempo: {executionTime ?? "-"} - Linhas: {queryResult.length}
       </div>
       {isLoading ? (
         <div className="spinner" aria-label="Executando consulta" />
       ) : queryResult.length > 0 ? (
         <div className="table-wrapper result-table">
           <table>
             <thead>
               <tr>
                 {columns.map((column) => (
                   <th key={column}>{column}</th>
                 ))}
               </tr>
             </thead>
             <tbody>
               {queryResult.map((row, index) => (
                 <tr key={index}>
                   {columns.map((column) => (
                     <td key={column}>{String(row[column] ?? "")}</td>
                   ))}
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       ) : (
         <p className="muted">Execute a consulta para ver os resultados aqui.</p>
       )}
     </section>
   );
 }
