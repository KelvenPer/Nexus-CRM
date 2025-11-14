import { fetchJson } from "@/lib/api";
import { API_BASE_URL, getAuthHeaders } from "@/lib/auth";
import type { MarketingCampaign, MarketingSegment } from "@/types/marketing";

export async function listCampaigns(): Promise<MarketingCampaign[]> {
  const data = await fetchJson<MarketingCampaign[]>("/api/v1/marketing/campanhas", []);
  return Array.isArray(data) ? data : [];
}

export async function listSegments(): Promise<MarketingSegment[]> {
  const data = await fetchJson<MarketingSegment[]>("/api/v1/marketing/segmentos", []);
  return Array.isArray(data) ? data : [];
}

type CampaignCreatePayload = {
  nome: string;
  status: string;
  inicio: string; // ISO date
  fim: string; // ISO date or empty
  investimento: number; // BRL amount
};

export async function createCampaign(
  payload: CampaignCreatePayload
): Promise<MarketingCampaign | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/marketing/campanhas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    return (await response.json()) as MarketingCampaign;
  } catch (err) {
    console.error(err);
    return null;
  }
}

