'use client';

import { useState } from 'react';

import ProofUploadWizard from './ProofUploadWizard';

type Props = {
  asset: any;
};

export default function MobileProofUpload({ asset }: Props) {
  const [openWizard, setOpenWizard] = useState(false);

  return (
    <div className='lg:hidden p-4 space-y-4'>
      <div className='flex justify-between items-center'>
        <h2 className='text-lg font-semibold'>Enviar comprovacao</h2>
        <button className='text-blue-600' onClick={() => setOpenWizard(true)}>
          Abrir wizard
        </button>
      </div>
      <div className='grid grid-cols-2 gap-3'>
        {[
          { icon: '??', label: 'Foto rapida' },
          { icon: '???', label: 'Galeria' },
          { icon: '??', label: 'Documento' },
          { icon: '??', label: 'Video' },
        ].map((action) => (
          <button key={action.label} className='border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 text-sm'>
            <span className='text-3xl'>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
      {openWizard ? <ProofUploadWizard asset={asset} isOpen={true} onClose={() => setOpenWizard(false)} /> : null}
    </div>
  );
}

