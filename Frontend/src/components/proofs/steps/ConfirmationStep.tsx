type Props = {
  results: { id: string; file_name: string }[];
  onClose: () => void;
};

export default function ConfirmationStep({ results, onClose }: Props) {
  return (
    <div className='text-center space-y-4'>
      <div className='text-4xl'>?</div>
      <h3 className='text-xl font-semibold'>Comprovacoes enviadas!</h3>
      <p className='text-sm text-gray-500'>Total de {results.length} arquivos processados.</p>
      <button className='bg-blue-600 text-white px-4 py-2 rounded' onClick={onClose}>
        Fechar
      </button>
    </div>
  );
}

