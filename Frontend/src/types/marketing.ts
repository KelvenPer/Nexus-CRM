export type CampaignStatus = "rascunho" | "ativa" | "pausada" | "encerrada" | string;

export type MarketingCampaign = {
  id: string;
  nome: string;
  status: CampaignStatus;
  investimento: number;
  inicio: string; // ISO date
  fim: string; // ISO date
};

export type MarketingSegment = {
  id: string;
  nome: string;
  regra: string;
  tamanho: number;
};

