import { RefreshCcw } from "lucide-react";

function AlertasHeader({ onRefresh }) {
  return (
    <div className="bg-gradient-to-r from-red-700 via-red-800 to-slate-900 rounded-2xl p-7 text-white shadow-xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Alertas de stock
          </h1>

          <p className="text-red-100 mt-1">
            Avisos de inventario bajo y rollos por revisar.
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

export default AlertasHeader;
