import { formatoCop } from "../finanzas.helpers";

function FinanzasStats({ resumen }) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
      <Stat
        label="Pedidos costeados"
        value={resumen?.pedidosCosteados || 0}
      />
      <Stat
        label="Total costeado"
        value={formatoCop.format(
          resumen?.totalCosteado || 0
        )}
      />
      <Stat
        label="Rollos costeados"
        value={resumen?.totalRollos || 0}
      />
      <Stat
        label="Promedio por rollo"
        value={formatoCop.format(
          resumen?.costoPromedioRollo || 0
        )}
      />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <p className="text-slate-500 text-sm">
        {label}
      </p>
      <h2 className="text-2xl font-bold mt-1 text-slate-800">
        {value}
      </h2>
    </div>
  );
}

export default FinanzasStats;
