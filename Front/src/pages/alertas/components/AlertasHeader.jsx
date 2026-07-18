import { BellRing, RefreshCcw, ShieldCheck } from "lucide-react";

function AlertasHeader({ onRefresh }) {
  return (
    <div className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
      <div className="h-1.5 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500" />

      <div className="flex flex-wrap justify-between items-center gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/20">
            <BellRing size={26} />
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <ShieldCheck size={14} />
              Monitoreo activo
            </div>

            <h1 className="text-3xl font-black text-slate-900">
              Alertas de stock
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Prioriza inventario bajo, ventas pendientes y rollos por revisar.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          <RefreshCcw size={18} />
          Actualizar
        </button>
      </div>
    </div>
  );
}

export default AlertasHeader;
