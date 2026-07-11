import { RefreshCcw } from "lucide-react";

function FinanzasHeader({ onRefresh }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Costos por pedido
        </h1>
        <p className="text-slate-500">
          Calcula el costo real de cada rollo y revisa rentabilidad.
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-xl flex items-center gap-2 self-start lg:self-auto"
      >
        <RefreshCcw size={18} />
        Actualizar
      </button>
    </div>
  );
}

export default FinanzasHeader;
