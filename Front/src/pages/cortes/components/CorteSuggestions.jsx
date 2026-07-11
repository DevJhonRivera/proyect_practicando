import {
  servicioLabels,
  tipoCorteLabels,
} from "../cortes.constants";

function CorteSuggestions({
  sugerencias,
  sugerenciasKey,
  loading,
  marca,
  modelo,
  tipoCorte,
  onApply,
}) {
  const puedeBuscar =
    marca.trim().length >= 2 &&
    modelo.trim().length >= 2;
  const queryKey =
    `${marca.trim()}|${modelo.trim()}|${tipoCorte}`;
  const estaBuscando =
    loading || sugerenciasKey !== queryKey;
  const sugerenciasActuales =
    sugerencias.filter(
      (sugerencia) =>
        sugerencia.tipoCorte === tipoCorte
    );

  if (!puedeBuscar) {
    return null;
  }

  return (
    <div className="md:col-span-2 xl:col-span-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-blue-900">
            Sugerencias para el mismo vidrio
          </p>
          <p className="text-sm text-blue-700">
            Basado en cortes anteriores de {marca} {modelo} para{" "}
            {tipoCorteLabels[tipoCorte] || tipoCorte}.
          </p>
        </div>

        {estaBuscando && (
          <span className="text-sm font-medium text-blue-700">
            Buscando...
          </span>
        )}
      </div>

      {!estaBuscando && sugerenciasActuales.length === 0 && (
        <p className="mt-3 text-sm text-blue-700">
          Todavia no hay cortes anteriores para este vidrio en esa marca y modelo.
        </p>
      )}

      {!estaBuscando && sugerenciasActuales.length > 0 && (
        <div className="mt-4 grid lg:grid-cols-2 gap-3">
          {sugerenciasActuales.map((sugerencia) => (
            <SuggestionCard
              key={sugerencia.tipoCorte}
              sugerencia={sugerencia}
              onApply={onApply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ sugerencia, onApply }) {
  const ultimo = sugerencia.ultimoCorte;

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-800">
            {tipoCorteLabels[sugerencia.tipoCorte] ||
              sugerencia.tipoCorte}
          </p>
          <p className="text-sm text-slate-500">
            Usado {sugerencia.cantidad} vez
            {sugerencia.cantidad === 1 ? "" : "es"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onApply(sugerencia)}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Usar
        </button>
      </div>

      <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
        <InfoMini
          label="Metros sugeridos"
          value={`${Number(
            sugerencia.promedioMetros || 0
          ).toFixed(2)} m`}
        />
        <InfoMini
          label="Ultimo corte"
          value={
            ultimo?.createdAt
              ? new Date(
                  ultimo.createdAt
                ).toLocaleDateString()
              : "-"
          }
        />
        <InfoMini
          label="Servicios"
          value={
            sugerencia.servicios
              ?.map(
                (servicio) =>
                  servicioLabels[servicio] ||
                  servicio
              )
              .join(", ") || "-"
          }
        />
        <InfoMini
          label="Placas anteriores"
          value={sugerencia.placas?.join(", ") || "-"}
        />
      </div>
    </div>
  );
}

function InfoMini({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-400">
        {label}
      </p>
      <p className="font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

export default CorteSuggestions;
