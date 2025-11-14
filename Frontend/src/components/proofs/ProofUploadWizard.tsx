import { useState } from 'react';

import { uploadFileWithProgress } from '@/utils/uploadWithProgress';
import FileSelectionStep from './steps/FileSelectionStep';
import MetadataStep from './steps/MetadataStep';
import ReviewStep from './steps/ReviewStep';
import ConfirmationStep from './steps/ConfirmationStep';

interface ProofMetadata {
  description?: string;
  location?: string;
  taken_at?: string;
  proof_type?: string;
}

interface UploadResult {
  id: string;
  file_name: string;
}

type WizardProps = {
  asset: any;
  isOpen: boolean;
  onClose: () => void;
};

const steps = [
  { number: 1, title: 'Selecionar arquivos', icon: '??' },
  { number: 2, title: 'Detalhes', icon: '??' },
  { number: 3, title: 'Revisar', icon: '???' },
  { number: 4, title: 'Confirmacao', icon: '?' },
];

export default function ProofUploadWizard({ asset, isOpen, onClose }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [metadata, setMetadata] = useState<ProofMetadata>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [results, setResults] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleFilesSelect = (files: FileList) => {
    setSelectedFiles(Array.from(files));
    setCurrentStep(2);
  };

  const handleMetadataSubmit = (data: ProofMetadata) => {
    setMetadata(data);
    setCurrentStep(3);
  };

  const handleUpload = async () => {
    setIsUploading(true);
    const uploadResults: UploadResult[] = [];
    for (const file of selectedFiles) {
      const response = await uploadFileWithProgress(
        file,
        asset.id,
        metadata,
        (progress) => setUploadProgress((prev) => ({ ...prev, [file.name]: progress }))
      );
      uploadResults.push(response.proof);
    }
    setResults(uploadResults);
    setIsUploading(false);
    setCurrentStep(4);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <FileSelectionStep asset={asset} onFilesSelect={handleFilesSelect} onClose={onClose} />;
      case 2:
        return (
          <MetadataStep
            files={selectedFiles}
            metadata={metadata}
            onBack={() => setCurrentStep(1)}
            onSubmit={handleMetadataSubmit}
          />
        );
      case 3:
        return (
          <ReviewStep
            files={selectedFiles}
            metadata={metadata}
            onBack={() => setCurrentStep(2)}
            onUpload={handleUpload}
            uploading={isUploading}
            progress={uploadProgress}
          />
        );
      case 4:
        return <ConfirmationStep results={results} onClose={onClose} />;
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col'>
        <div className='border-b px-6 py-4 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold'>Enviar comprovacoes</h2>
            <p className='text-sm text-gray-500'>{asset?.asset_name}</p>
          </div>
          <button onClick={onClose} className='text-xl text-gray-500'>×</button>
        </div>
        <div className='border-b px-6 py-4'>
          <div className='flex items-center justify-between'>
            {steps.map((step, index) => (
              <div key={step.number} className='flex items-center'>
                <div className={w-10 h-10 rounded-full flex items-center justify-center text-sm }>
                  {step.icon}
                </div>
                <span className={ml-2 text-sm }>
                  {step.title}
                </span>
                {index < steps.length - 1 ? (
                  <div className={w-12 h-0.5 mx-3 } />
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className='flex-1 overflow-y-auto p-6'>{renderStep()}</div>
      </div>
    </div>
  );
}

