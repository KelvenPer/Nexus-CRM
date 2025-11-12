 "use client";

 import React, {
   forwardRef,
   useCallback,
   useImperativeHandle,
   useMemo,
   useState,
 } from "react";

 export type MetadadosPayload = {
   nomeAmigavel: string;
   idObjeto: string;
   sqlQuery: string;
 };

 type MetadadosPanelProps = {
   onSaveClick: (payload: MetadadosPayload) => void;
   sqlQuery: string;
   isTestSuccessful: boolean;
 };

 export type MetadadosPanelHandle = {
   submit: () => void;
 };

 const MetadadosPanel = forwardRef<MetadadosPanelHandle, MetadadosPanelProps>(
   function MetadadosPanel({ onSaveClick, sqlQuery, isTestSuccessful }, ref) {
     const [nomeAmigavel, setNomeAmigavel] = useState("");
     const [idObjeto, setIdObjeto] = useState("");
     const [descricao, setDescricao] = useState("");

     const canSave = useMemo(
       () =>
         Boolean(
           isTestSuccessful &&
             nomeAmigavel.trim().length &&
             idObjeto.trim().length &&
             sqlQuery.trim().length
         ),
       [idObjeto, isTestSuccessful, nomeAmigavel, sqlQuery]
     );

     const handleConfirm = useCallback(() => {
       if (!canSave) return;
       onSaveClick({
         nomeAmigavel: nomeAmigavel.trim(),
         idObjeto: idObjeto.trim(),
         sqlQuery: sqlQuery.trim(),
       });
     }, [canSave, idObjeto, nomeAmigavel, onSaveClick, sqlQuery]);

     useImperativeHandle(ref, () => ({ submit: handleConfirm }), [handleConfirm]);

     return (
       <section className="metadata-panel">
         <h3>Metadados do Objeto</h3>
         <div className="metadata-group">
           <label>
             Nome amigavel
             <input
               value={nomeAmigavel}
               onChange={(event) => setNomeAmigavel(event.target.value)}
               placeholder="Campanha consolidada"
             />
           </label>
           <label>
             ID do objeto
             <input
               value={idObjeto}
               onChange={(event) => setIdObjeto(event.target.value)}
               placeholder="visor_campanhas"
             />
           </label>
           <label>
             Descricao
             <textarea
               rows={3}
               value={descricao}
               onChange={(event) => setDescricao(event.target.value)}
               placeholder="Descricao resumida para o usuario"
             />
           </label>
           <button
             className="primary-button"
             type="button"
             disabled={!canSave}
             onClick={handleConfirm}
           >
             Confirmar salvamento
           </button>
         </div>
       </section>
     );
   }
 );

 MetadadosPanel.displayName = "MetadadosPanel";

 export default MetadadosPanel;
