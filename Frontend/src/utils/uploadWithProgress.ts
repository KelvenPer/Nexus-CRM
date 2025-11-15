import { API_BASE_URL } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth";

type UploadResponse = {
  proof: {
    id: string;
    file_name: string;
  };
};

export const uploadFileWithProgress = (
  file: File,
  assetId: string,
  metadata: Record<string, any>,
  onProgress: (progress: number) => void
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('proof', file);
  formData.append('assetId', assetId);
  formData.append('description', metadata.description ?? '');
  formData.append('proofType', metadata.proof_type ?? 'photo');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/proofs/upload`);

    const authHeaders =
      typeof window !== "undefined"
        ? (getAuthHeaders() as Record<string, string>)
        : ({} as Record<string, string>);
    Object.entries(authHeaders).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.setRequestHeader("X-Tenant-ID", "tenant_demo");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.statusText));
      }
    };
    xhr.onerror = () => reject(new Error('upload error'));
    xhr.send(formData);
  });
};

