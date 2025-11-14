import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export default class SupplierErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Supplier portal error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow p-6 max-w-md">
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Algo deu errado</h2>
            <p className="text-gray-600 mb-4">Tente atualizar a pagina ou entre em contato com o suporte.</p>
            <div className="space-y-2">
              <button className="w-full bg-blue-600 text-white py-2 rounded" onClick={() => window.location.reload()}>
                Recarregar
              </button>
              <button className="w-full border border-gray-300 py-2 rounded" onClick={() => (window.location.href = "/Supplier/Portal")}>
                Ir para dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
