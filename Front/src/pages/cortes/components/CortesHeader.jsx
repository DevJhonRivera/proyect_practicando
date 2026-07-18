import { RefreshCcw, Scissors } from "lucide-react";

function CortesHeader({ onRefresh }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Scissors size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Registrar cortes
            </h1>

            <p className="text-sm text-slate-500">
              Registra el material usado por vehiculo y calcula costos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCcw size={18} />
          Actualizar
        </button>
      </div>
    </div>
  );
}

export default CortesHeader;
