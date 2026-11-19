import { Component } from "react";

export default class ModuleErrorBoundary extends Component {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidUpdate(prevProps) {
    if (this.state.fallo && prevProps.pathname !== this.props.pathname) {
      this.setState({ fallo: false });
    }
  }

  render() {
    if (!this.state.fallo) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section role="alert" className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-lg font-bold text-slate-900">No se pudo abrir este módulo</h1>
          <p className="mt-2 text-sm text-slate-600">Vuelve a cargar la página para intentarlo de nuevo.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">
            Volver a cargar
          </button>
        </section>
      </main>
    );
  }
}
