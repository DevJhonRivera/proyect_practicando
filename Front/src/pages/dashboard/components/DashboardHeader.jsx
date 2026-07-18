import {
  CalendarDays,
  Clock,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

function DashboardHeader({ actualizar }) {
  const usuario = JSON.parse(
    localStorage.getItem("usuario")
  );

  const fecha = new Date();

  const fechaActual = fecha.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hora = fecha.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-6 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-7">
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-4">
            <div className="rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-950/20">
              <LayoutDashboard size={30} />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-950 lg:text-4xl">
                Inicio
              </h1>
              <p className="text-slate-500">
                Flujo diario de compras, inventario y cortes
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <InfoPill
              icon={CalendarDays}
              color="text-blue-600"
              text={fechaActual}
            />
            <InfoPill
              icon={Clock}
              color="text-emerald-600"
              text={`Ultima actualizacion ${hora}`}
            />
            <InfoPill
              icon={ShieldCheck}
              color="text-amber-600"
              text={`Bienvenido, ${
                usuario?.nombre || "Administrador"
              }`}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={actualizar}
          className="inline-flex items-center justify-center gap-3 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <RefreshCw size={20} />
          Actualizar inicio
        </button>
      </div>

      <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-500 lg:px-7">
        <span>Polarizados YA 2026</span>
        <span>Pedido / Entrada / Bodega / Uso / Corte / Rentabilidad</span>
      </div>
    </section>
  );
}

function InfoPill({ icon: Icon, color, text }) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
      <Icon size={16} className={color} />
      <span className="truncate">{text}</span>
    </div>
  );
}

export default DashboardHeader;
