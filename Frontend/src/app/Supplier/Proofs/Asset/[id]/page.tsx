import AppShell from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import type { AssetProof } from "@/types/trade";

type AssetDetail = {
  id: string;
  asset_name: string;
  placement?: string | null;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  metrics: Record<string, unknown>;
};

type Props = {
  params: { id: string };
};

async function fetchAsset(id: string) {
  return apiFetch<AssetDetail>(`/api/trade/assets/${id}`);
}

async function fetchProofs(id: string) {
  return apiFetch<AssetProof[]>(`/api/trade/assets/${id}/proofs`);
}

export default async function AssetDetailPage({ params }: Props) {
  const asset = await fetchAsset(params.id);
  const proofs = (await fetchProofs(params.id)) ?? [];

  return (
    <AppShell>
      <div className="p-6 trade-page">
        <h1>{asset?.asset_name ?? "Ativo"}</h1>
        <p className="muted">
          {asset
            ? `${new Date(asset.scheduled_start).toLocaleDateString("pt-BR")} - ${new Date(
                asset.scheduled_end,
              ).toLocaleDateString("pt-BR")}`
            : null}
        </p>

        <section className="card mt-4">
          <h3>Detalhes</h3>
          <p>Status: {asset?.status}</p>
          <p>Posicionamento: {asset?.placement ?? "N/A"}</p>
        </section>

        <section className="card mt-6">
          <h3>Comprovações enviadas</h3>
          {proofs.length === 0 ? (
            <p>Sem comprovações. <a className="link" href={`/Supplier/Proofs/Upload?asset=${params.id}`}>Adicionar agora</a>.</p>
          ) : (
            <table className="trade-table mt-4">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Envio</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {proofs.map((proof) => (
                  <tr key={proof.id}>
                    <td>{proof.proof_type}</td>
                    <td>
                      <a href={proof.url} target="_blank" rel="noreferrer" className="link">
                        {proof.description ?? proof.url}
                      </a>
                    </td>
                    <td>{new Date(proof.uploaded_at).toLocaleString("pt-BR")}</td>
                    <td>{proof.verified ? "Aprovado" : "Em revisão"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
