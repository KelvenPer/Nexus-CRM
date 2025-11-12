"use client";
import React, { useState } from 'react';
import { GenericDataTable, Column } from '@/components/data/GenericDataTable';
import { metaObjectRows as initialRows } from '@/data/mockObjects';
import Link from 'next/link';
import PermissionsModal from '@/components/metadados/PermissionsModal';

const MetadadosObjetosPage = () => {
  const [tableData, setTableData] = useState(initialRows);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);

  const openPermissionsModal = (row) => {
    setSelectedObject(row);
    setIsModalOpen(true);
  };

  const closePermissionsModal = () => {
    setIsModalOpen(false);
    setSelectedObject(null);
  };

  const handleSavePermissions = (newProfiles) => {
    setTableData(currentData =>
      currentData.map(row =>
        row.idObjeto === selectedObject.idObjeto
          ? { ...row, perfis: newProfiles.join(', ') }
          : row
      )
    );
    closePermissionsModal();
  };

  const ActionButtons = ({ row }) => (
    <div className="flex items-center gap-2">
      <Link href={`/dados/estudio-sql?id=${row.idObjeto}`} passHref>
        <button
          className="text-sm p-1 px-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={row.tipo === 'BASE'}
          title={row.tipo === 'BASE' ? 'Objetos BASE não podem ser editados' : 'Editar objeto'}
        >
          Editar
        </button>
      </Link>
      <button 
        onClick={() => openPermissionsModal(row)}
        className="text-sm p-1 px-2 rounded-md bg-gray-200 hover:bg-gray-300">
        Permissões
      </button>
      <button
        className="text-sm p-1 px-2 rounded-md bg-red-200 hover:bg-red-300 text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={row.tipo === 'BASE'}
        title={row.tipo === 'BASE' ? 'Objetos BASE não podem ser excluídos' : 'Excluir objeto'}
      >
        Excluir
      </button>
    </div>
  );

  const ProfileTags = ({ profiles }) => (
    <div className="flex flex-wrap gap-1">
      {profiles.split(',').filter(p => p).map((profile) => (
        <span key={profile.trim()} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {profile.trim()}
        </span>
      ))}
    </div>
  );

  const columns: Column[] = [
    { key: "nomeAmigavel", label: "Nome Amigável" },
    { key: "idObjeto", label: "ID do Objeto" },
    { key: "tipo", label: "Tipo" },
    { key: "status", label: "Status" },
    {
      key: "perfis",
      label: "Perfis de Acesso",
      render: (row) => <ProfileTags profiles={row.perfis} />,
    },
    {
      key: "acoes",
      label: "Ações",
      render: (row) => <ActionButtons row={row} />,
    },
  ];

  return (
    <div>
      <GenericDataTable
        title="Catálogo de Objetos de Dados"
        description="Gerencie todos os objetos de dados (fontes de dados para relatórios) disponíveis no seu tenant."
        columns={columns}
        data={tableData}
      />
      {selectedObject && (
        <PermissionsModal
          isOpen={isModalOpen}
          onClose={closePermissionsModal}
          onSave={handleSavePermissions}
          objectName={selectedObject.nomeAmigavel}
          currentProfiles={selectedObject.perfis}
        />
      )}
    </div>
  );
};

export default MetadadosObjetosPage;
