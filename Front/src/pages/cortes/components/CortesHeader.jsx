import { RefreshCcw } from "lucide-react";

function CortesHeader({ onRefresh }) {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 rounded-2xl p-7 text-white shadow-xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Registrar cortes
          </h1>

          <p className="text-slate-300 mt-1">
            Registra el material usado por vehiculo y calcula costos.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl flex items-center gap-2"
        >
          <RefreshCcw size={18} />
          Actualizar
        </button>
      </div>
    </div>
  );
}

export default CortesHeader;
