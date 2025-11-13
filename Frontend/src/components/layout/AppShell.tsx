import Sidebar from "./Sidebar";
import { DensityProvider, useDensity } from "@/hooks/useDensity";
import { HighContrastProvider, useHighContrast } from "@/hooks/useHighContrast";

function HeaderToggles() {
  const { density, toggleDensity } = useDensity();
  const { highContrast, toggleHighContrast } = useHighContrast();
  return (
    <div className="header-toggles" style={{ display: "flex", gap: 8 }}>
      <button className="ghost-button" onClick={toggleDensity} title={`Densidade: ${density}`} aria-label="Alternar densidade">
        Aa
      </button>
      <button className="ghost-button" onClick={toggleHighContrast} title={`Alto contraste: ${highContrast ? "on" : "off"}`} aria-label="Alternar alto contraste">
        HC
      </button>
    </div>
  );
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HighContrastProvider>
      <DensityProvider>
        <div className="app-shell">
          <Sidebar />
          <div className="app-content">
            <header className="app-shell-header">
              <div className="header-brand">
                <span className="logo-mark">N</span>
                <div>
                  <p className="eyebrow">Nexus CRM</p>
                  <strong>Console multi-tenants</strong>
                </div>
              </div>
              <div className="header-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div className="search-field"><input aria-label="Buscar" placeholder="Buscar deals, objetos e objetos customizados" /></div>
                <HeaderToggles />
                <button className="icon-button" aria-label="Notificacoes">??<span className="notification-dot" /></button>
                <button className="icon-button" aria-label="Perfil">??</button>
              </div>
            </header>
            <main className="app-main">{children}</main>
          </div>
        </div>
      </DensityProvider>
    </HighContrastProvider>
  );
}
