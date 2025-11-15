"use client";

import type { ContractAsset } from "@/types/trade";

type AssetSelectorProps = {
  assets: ContractAsset[];
  selectedAssetId: string | null;
  onAssetSelect: (assetId: string) => void;
};

export function AssetSelector({ assets, selectedAssetId, onAssetSelect }: AssetSelectorProps) {
  if (!assets.length) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          ℹ️ Este contrato não possui assets específicos definidos. As comprovações serão associadas ao contrato geral.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Selecione o asset para comprovar:
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            className={`text-left border rounded-lg p-4 cursor-pointer transition-all ${
              selectedAssetId === asset.id
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onClick={() => onAssetSelect(asset.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{asset.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{asset.asset_type}</p>
                <p className="text-sm text-gray-600 mt-1">{asset.description}</p>

                <div className="flex flex-wrap gap-1 mt-2">
                  {asset.proof_requirements.map((req) => (
                    <span
                      key={req}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                    >
                      {getProofRequirementIcon(req)} {req}
                    </span>
                  ))}
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedAssetId === asset.id ? "border-blue-500 bg-blue-500" : "border-gray-300"
                }`}
              >
                {selectedAssetId === asset.id ? <div className="w-2 h-2 rounded-full bg-white" /> : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function getProofRequirementIcon(requirement: string): string {
  const icons: Record<string, string> = {
    image: "📷",
    screenshot: "🖼️",
    video: "🎥",
    document: "📄",
    report: "📊",
  };
  return icons[requirement] ?? "✅";
}

export default AssetSelector;

