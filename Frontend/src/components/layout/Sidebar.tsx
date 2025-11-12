"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Submodule = {
  label: string;
  href: string;
  icon: string;
};

type Module = {
  title: string;
  icon: string;
  submodules: Submodule[];
};

const modules: Module[] = [
  {
    title: "INICIO / GERAL",
    icon: "🧭",
    submodules: [
      { label: "Dashboard", href: "/", icon: "📊" },
      { label: "Minhas Atividades", href: "/inicio/atividades", icon: "📝" },
      { label: "Calendario", href: "/inicio/calendario", icon: "📅" },
      { label: "Lembretes", href: "/inicio/lembretes", icon: "⏰" },
    ],
  },
  {
    title: "VENDAS",
    icon: "💼",
    submodules: [
      { label: "Painel do modulo", href: "/vendas", icon: "📈" },
      { label: "Leads / Prospects", href: "/vendas/leads", icon: "🧲" },
      { label: "Oportunidades / Funil", href: "/vendas/oportunidades", icon: "🎯" },
      { label: "Contas e Contatos", href: "/vendas/contas-contatos", icon: "👥" },
      { label: "Produtos e Catalogo", href: "/vendas/produtos", icon: "📦" },
    ],
  },
  {
    title: "MARKETING",
    icon: "📣",
    submodules: [
      { label: "Painel do modulo", href: "/marketing", icon: "🗂️" },
      { label: "Campanhas", href: "/marketing/campanhas", icon: "🚀" },
      { label: "Segmentacao", href: "/marketing/segmentacao", icon: "🧩" },
    ],
  },
  {
    title: "SOLUCOES",
    icon: "🧩",
    submodules: [
      { label: "Trade Marketing", href: "/solucoes/trade", icon: "🏪" },
      { label: "Atendimento", href: "/solucoes/atendimento", icon: "🎧" },
    ],
  },
  {
    title: "AUTOMACAO",
    icon: "⚙️",
    submodules: [
      { label: "Workflows (Fluxos)", href: "/automacao/workflows", icon: "🔁" },
      { label: "Gatilhos de Dados", href: "/automacao/gatilhos", icon: "🎯" },
      { label: "Templates de E-mail", href: "/automacao/templates", icon: "✉️" },
    ],
  },
  {
    title: "AREA DE DADOS",
    icon: "🧮",
    submodules: [
      { label: "Estudio SQL", href: "/dados/estudio-sql", icon: "💻" },
      { label: "Relatorios e BI", href: "/area-de-dados/relatorios-bi", icon: "📊" },
      { label: "Metadados (Objetos)", href: "/area-de-dados/metadados-objetos", icon: "🗃️" },
    ],
  },
];

const userMenuLinks = [
  { label: "Configuracoes", href: "/perfil/configuracoes", icon: "⚙️" },
  { label: "Tenant Admin", href: "/tenant-admin", icon: "🧑‍💼" },
  { label: "Centro de Ajuda", href: "/ajuda", icon: "❓" },
];

const isActive = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/dashboard");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function Sidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">N</div>
        <div>
          <strong>NEXUS CRM</strong>
          <p>Console multi-tenants</p>
        </div>
      </div>
      <div className="sidebar-section navigation">
        {modules.map((module) => {
          const moduleActive = module.submodules.some((sub) => isActive(pathname, sub.href));
          return (
            <div key={module.title} className="module-group">
              <div className={`module-title ${moduleActive ? "is-active" : ""}`}>
                <span aria-hidden="true">{module.icon}</span>
                <strong>{module.title}</strong>
                <span className="module-arrow" aria-hidden="true">
                  {moduleActive ? "v" : ">"}
                </span>
              </div>
              <ul>
                {module.submodules.map((sub) => {
                  const active = isActive(pathname, sub.href);
                  return (
                    <li key={sub.label}>
                      <Link
                        href={sub.href}
                        className={active ? "is-active" : ""}
                        aria-current={active ? "page" : undefined}
                      >
                        <span className="submodule-icon" aria-hidden="true">
                          {sub.icon}
                        </span>
                        <span>{sub.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="user-profile-menu">
          <div className="user-profile">
            <span className="avatar">AH</span>
            <div>
              <strong>Aline Husni</strong>
              <p className="muted">Admin - tenant_lima</p>
            </div>
          </div>
          <ul>
            {userMenuLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href}>
                  <span aria-hidden="true">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button className="ghost-button logout-button">Logout</button>
        </div>
      </div>
    </aside>
  );
}
