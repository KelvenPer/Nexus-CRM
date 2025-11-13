import React from 'react';

interface ActionToolbarProps {
  onTestClick: () => void;
  onSaveClick: () => void;
  onClearClick: () => void;
  isQueryValid: boolean;
  isTestSuccessful: boolean;
  isLoading: boolean;
}

const ActionToolbar: React.FC<ActionToolbarProps> = ({
  onTestClick,
  onSaveClick,
  onClearClick,
  isQueryValid,
  isTestSuccessful,
  isLoading,
}) => {
  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-800 rounded-lg">
      <button
        onClick={onTestClick}
        disabled={!isQueryValid || isLoading}
        className="px-4 py-2 text-white bg-blue-600 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-blue-700"
      >
        {isLoading ? "Testando..." : "Testar consulta"}
      </button>
      <button
        onClick={onSaveClick}
        disabled={!isTestSuccessful || !isQueryValid || isLoading}
        className="px-4 py-2 text-black bg-lime-400 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-lime-500"
      >
        Salvar novo objeto
      </button>
      <button
        onClick={onClearClick}
        disabled={isLoading}
        className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-500"
      >
        Limpar
      </button>
    </div>
  );
};

export default ActionToolbar;
