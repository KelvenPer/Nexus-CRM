import { API_BASE_URL } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth";

export type UploadProofOptions = {
  type?: string;
  description?: string;
};

export async function uploadProof(
  assetId: string,
  file: File,
  options: UploadProofOptions = {},
): Promise<boolean> {
  const form = new FormData();
  form.append("asset_id", assetId);
  form.append("file", file);
  if (options.description) {
    form.append("description", options.description);
  }
  if (options.type) {
    form.append("proof_type", options.type);
  }

  const response = await fetch(`${API_BASE_URL}/api/proofs/upload`, {
    method: "POST",
    headers: {
      ...(getAuthHeaders() as Record<string, string>),
    },
    body: form,
  });

  return response.ok;
}

