"use client";
import React, { useState, useEffect } from 'react';
import { userProfiles } from '@/data/mockObjects';

type PermissionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedProfiles: string[]) => void;
  objectName: string;
  currentProfiles: string;
};

const PermissionsModal = ({ isOpen, onClose, onSave, objectName, currentProfiles }: PermissionsModalProps) => {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const profileIds = currentProfiles.split(',').map(p => {
        const profile = userProfiles.find(up => up.name === p.trim());
        return profile ? profile.id : '';
      }).filter(Boolean);
      setSelected(profileIds);
    }
  }, [isOpen, currentProfiles]);

  if (!isOpen) return null;

  const handleCheckboxChange = (profileId: string) => {
    setSelected(prev =>
      prev.includes(profileId) ? prev.filter(p => p !== profileId) : [...prev, profileId]
    );
  };

  const handleSave = () => {
    const profileNames = selected.map(id => {
      const profile = userProfiles.find(up => up.id === id);
      return profile ? profile.name : '';
    }).filter(Boolean);
    onSave(profileNames);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Gerenciar Acesso: {objectName}</h2>
        <p className="text-sm text-gray-600 mb-4">
          Selecione os perfis de usuário que podem visualizar e utilizar este objeto de dados nos relatórios.
        </p>
        <div className="space-y-2">
          {userProfiles.map(profile => (
            <label key={profile.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={selected.includes(profile.id)}
                onChange={() => handleCheckboxChange(profile.id)}
              />
              <span className="text-gray-800">{profile.name}</span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="p-2 px-4 rounded-md bg-gray-200 hover:bg-gray-300">
            Cancelar
          </button>
          <button onClick={handleSave} className="p-2 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;
