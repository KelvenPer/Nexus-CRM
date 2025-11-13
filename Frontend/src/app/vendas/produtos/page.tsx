import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type Product = {
  id: string;
  sku: string;
  nome: string;
  categoria: string;
  preco: number;
  margem: number;
  disponibilidade: string;
  descricao?: string;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

async function fetchProducts(): Promise<Product[]> {
  const data = await fetchJson<Product[]>("/api/v1/vendas/produtos", []);
  return Array.isArray(data) ? data : [];
}

export default async function ProdutosPage() {
  const products = await fetchProducts();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Produtos e Catalogo</p>
            <h2>Portifolio comercial</h2>
            <p className="muted">
              Mantenha ofertas, kits e servicos alinhados com pricing e disponibilidade. Esses dados alimentam o funil e
              os templates de e-mail.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Importar lista</button>
            <button className="primary-button">Novo produto</button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3"
            >
              <header className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">{product.categoria}</p>
                  <h3 className="text-lg text-white font-semibold">{product.nome}</h3>
                </div>
                <span className="badge">{product.disponibilidade}</span>
              </header>
              <p className="text-sm text-gray-300">{product.descricao ?? "Sem descricao"}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">SKU</p>
                  <strong>{product.sku}</strong>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Preco</p>
                  <strong>{currency.format(product.preco)}</strong>
                  <p className="text-xs text-green-400">{Math.round(product.margem * 100)}% margem</p>
                </div>
              </div>
            </article>
          ))}
          {!products.length && (
            <div className="p-6 border border-dashed border-gray-700 rounded-xl text-center text-gray-400 col-span-full">
              Nenhum produto cadastrado no catalogo.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
