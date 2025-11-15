"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";

// --- Placeholder Icon ---
const UploadCloud = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" />
    <path d="m16 16-4-4-4 4" />
  </svg>
);

// --- Main Component ---

type ModernProofUploadProps = {
  assetId?: string; // Assuming assetId might be passed
};

const ModernProofUpload: React.FC<ModernProofUploadProps> = ({ assetId }) => {
  const [isDragging, setIsDragging] = useState(false);

  // A simple handler for the drag events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Necessary to allow drop
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    // Handle the files
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      console.log("Files dropped:", files);
      // Here you would typically handle the file upload
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 border-dashed ${
        isDragging ? "border-primary-500" : "border-gray-300"
      } p-8 text-center transition-all hover:border-primary-400`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <UploadCloud className="w-8 h-8 text-sky-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Arraste seus arquivos aqui
        </h3>
        
        <p className="text-gray-600 mb-6">
          ou clique para selecionar do computador
        </p>
        
        <Button variant="primary" icon="📁">
          Selecionar Arquivos
        </Button>
        
        <p className="text-sm text-gray-500 mt-4">
          PNG, JPG, PDF até 10MB
        </p>
      </div>
    </div>
  );
};

export default ModernProofUpload;
