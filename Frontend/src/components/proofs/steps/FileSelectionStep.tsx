import { useState } from 'react';

type Props = {
  asset: any;
  onFilesSelect: (files: FileList) => void;
  onClose: () => void;
};

export default function FileSelectionStep({ asset, onFilesSelect, onClose }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files) {
      onFilesSelect(event.dataTransfer.files);
    }
  };

  return (
    <div className='space-y-4'>
      <div
        className={order-2 border-dashed rounded-xl p-8 text-center transition }
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <p className='text-lg font-semibold mb-2'>Selecione arquivos para {asset?.asset_name}</p>
        <p className='text-sm text-gray-500 mb-4'>Arraste ou clique no botao abaixo</p>
        <input id='proof-files' type='file' multiple accept='image/*,application/pdf,video/*' className='hidden' onChange={(e) => e.target.files && onFilesSelect(e.target.files)} />
        <label htmlFor='proof-files' className='inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer'>
          Escolher arquivos
        </label>
      </div>
      <button onClick={onClose} className='text-sm text-gray-500'>Cancelar</button>
    </div>
  );
}

