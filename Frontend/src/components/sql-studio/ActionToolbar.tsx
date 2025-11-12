 "use client";

 import React from "react";

 type ActionToolbarProps = {
   onTestClick: () => Promise<void> | void;
   onSaveClick: () => void;
   onClearClick: () => void;
   isQueryValid: boolean;
   isTestSuccessful: boolean;
   isLoading?: boolean;
 };

 export default function ActionToolbar({
   onTestClick,
   onSaveClick,
   onClearClick,
   isQueryValid,
   isTestSuccessful,
   isLoading,
 }: ActionToolbarProps) {
   return (
     <div className="data-actions">
       <button
         className="ghost-button btn-cyan"
         type="button"
         onClick={onTestClick}
         disabled={!isQueryValid || isLoading}
       >
         Testar consulta
       </button>
       <button
         className="primary-button btn-lime"
         type="button"
         onClick={onSaveClick}
         disabled={!isTestSuccessful}
       >
         Salvar novo objeto
       </button>
       <button className="ghost-button" type="button" onClick={onClearClick}>
         Limpar
       </button>
     </div>
   );
 }
