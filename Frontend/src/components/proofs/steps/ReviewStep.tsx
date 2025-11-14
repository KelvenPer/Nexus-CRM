interface Props {
  files: File[];
  metadata: Record<string, any>;
  onUpload: () => Promise<void>;
  onBack: () => void;
  uploading: boolean;
  progress: Record<string, number>;
}

export default function ReviewStep({ files, metadata, onUpload, onBack, uploading, progress }: Props) {
  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold mb-2'>Arquivos selecionados</h3>
        <ul className='space-y-2'>
          {files.map((file) => (
            <li key={file.name} className='flex justify-between text-sm bg-gray-100 px-3 py-2 rounded'>
              <span>{file.name}</span>
              <span>{progress[file.name] ? ${progress[file.name]}% : ${(file.size / 1024).toFixed(0)} KB}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className='text-lg font-semibold mb-2'>Metadata</h3>
        <pre className='bg-gray-100 p-3 rounded text-xs'>{JSON.stringify(metadata, null, 2)}</pre>
      </div>
      <div className='flex justify-between pt-4'>
        <button className='px-4 py-2 border rounded' onClick={onBack} disabled={uploading}>
          Voltar
        </button>
        <button className='px-4 py-2 bg-blue-600 text-white rounded' onClick={onUpload} disabled={uploading}>
          {uploading ? 'Enviando...' : 'Enviar' }
        </button>
      </div>
    </div>
  );
}

