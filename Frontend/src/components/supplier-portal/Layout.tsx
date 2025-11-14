"use client";

import React from "react";

export const SupplierPortalLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="supplier-portal">
      <header className="supplier-header">
        <div className="supplier-brand">
          <div className="logo-mark">N</div>
          <div>
            <p className="eyebrow">Portal do Fornecedor</p>
            <strong>Nexus CRM</strong>
          </div>
        </div>
        <div className="header-actions">
          <button className="ghost-button">Notificações</button>
          <button className="ghost-button">Minha Conta</button>
        </div>
      </header>
      <div className="supplier-body">
        <aside className="supplier-sidebar">
          <ul>
            <li><a href="/Supplier/Portal">Dashboard</a></li>
            <li><a href="/Supplier/Proofs/Dashboard">Comprovação</a></li>
            <li><a href="/Supplier/Proofs/History">Relatórios</a></li>
          </ul>
        </aside>
        <main className="supplier-content">{children}</main>
      </div>
    </div>
  );
};
