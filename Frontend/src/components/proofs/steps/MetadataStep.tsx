import { useState } from 'react';

interface Props {
  files: File[];
  metadata: Record<string, any>;
  onSubmit: (metadata: Record<string, any>) => void;
  onBack: () => void;
}

export default function MetadataStep({ files, metadata, onSubmit, onBack }: Props) {
  const [form, setForm] = useState({
    description: metadata.description ?? '',
    location: metadata.location ?? '',
    proof_type: metadata.proof_type ?? 'photo',
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className='space-y-4'
    >
      <div>
        <label className='block text-sm font-medium mb-1'>Tipo de comprovacao</label>
        <select
          value={form.proof_type}
          onChange={(e) => setForm((prev) => ({ ...prev, proof_type: e.target.value }))}
          className='w-full border rounded px-3 py-2'
        >
          <option value='photo'>Foto</option>
          <option value='screenshot'>Screenshot</option>
          <option value='document'>Documento</option>
        </select>
      </div>
      <div>
        <label className='block text-sm font-medium mb-1'>Descricao</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          className='w-full border rounded px-3 py-2'
        ></textarea>
      </div>
      <div className='flex justify-between pt-4'>
        <button type='button' className='px-4 py-2 border rounded' onClick={onBack}>
          Voltar
        </button>
        <button type='submit' className='px-4 py-2 bg-blue-600 text-white rounded'>
          Continuar ({files.length} arquivos)
        </button>
      </div>
    </form>
  );
}

