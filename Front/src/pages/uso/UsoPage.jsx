import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Filter,
  Package,
  RefreshCcw,
  Ruler,
  Search,
  TrendingDown,
  X
} from "lucide-react";

import { getUso } from "../../api/rollos.api";
import ExcelButton from "../../components/ui/ExcelButton";
import {
  anchoLabel,
  anchoValue,
  normalizarAncho,
} from "../../utils/anchos";
import { etiquetaDetalle } from "../../utils/materiales";

function UsoPage() {
  const [rollos, setRollos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [material, setMaterial] = useState("TODOS");
  const [porcentaje, setPorcentaje] = useState("TODOS");
  const [ancho, setAncho] = useState("TODOS");

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await getUso();
      setRollos(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const res = await getUso();

        if (active) {
          setRollos(res.data.data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    cargarInicial();

    return () => {
      active = false;
    };
  }, []);

  const formatMetros = (value) =>
    `${Number(value || 0).toFixed(2)} m`;

  const estados = useMemo(
    () => ["TODOS", ...new Set(rollos.map((r) => r.estado).filter(Boolean))],
    [rollos]
  );

  const materiales = useMemo(
    () => ["TODOS", ...new Set(rollos.map((r) => r.tipoPolarizado).filter(Boolean))],
    [rollos]
  );

  const porcentajes = useMemo(
    () => ["TODOS", ...new Set(rollos.map((r) => String(r.porcentaje)).filter(Boolean))],
    [rollos]
  );

  const anchos = useMemo(
    () => ["TODOS", ...new Set(rollos.map((r) => anchoValue(r.ancho)).filter(Boolean))],
    [rollos]
  );

  const filtrados = rollos.filter((rollo) => {
    const texto = search.toLowerCase();

    const coincideBusqueda =
      rollo.codigoRollo?.toLowerCase().includes(texto) ||
      rollo.tipoPolarizado?.toLowerCase().includes(texto);

    const coincideEstado =
      estado === "TODOS" || rollo.estado === estado;

    const coincideMaterial =
      material === "TODOS" || rollo.tipoPolarizado === material;

    const coincidePorcentaje =
      porcentaje === "TODOS" || String(rollo.porcentaje) === porcentaje;

    const coincideAncho =
      ancho === "TODOS" ||
      normalizarAncho(rollo.ancho) ===
        normalizarAncho(ancho);

    return (
      coincideBusqueda &&
      coincideEstado &&
      coincideMaterial &&
      coincidePorcentaje &&
      coincideAncho
    );
  });

  const totalRollos = filtrados.length;

  const metrosDisponibles = filtrados.reduce(
    (acc, r) => acc + Number(r.largoDisponible || 0),
    0
  );

  const metrosConsumidos = filtrados.reduce((acc, r) => {
    const consumido =
      Number(r.largoOriginal || 0) - Number(r.largoDisponible || 0);

    return acc + consumido;
  }, 0);

  const promedioConsumo =
    totalRollos > 0 ? metrosConsumidos / totalRollos : 0;

  const alertas = filtrados.filter(
    (r) => Number(r.largoDisponible || 0) <= 5
  );

  const topMateriales = Object.values(
    filtrados.reduce((acc, rollo) => {
      const key = `${rollo.tipoPolarizado} ${etiquetaDetalle(rollo)}`;

      const consumido =
        Number(rollo.largoOriginal || 0) -
        Number(rollo.largoDisponible || 0);

      if (!acc[key]) {
        acc[key] = {
          nombre: key,
          metros: 0
        };
      }

      acc[key].metros += consumido;

      return acc;
    }, {})
  )
    .sort((a, b) => b.metros - a.metros)
    .slice(0, 5);

  const maxTop =
    topMateriales.length > 0
      ? Math.max(...topMateriales.map((m) => m.metros))
      : 0;

  const limpiarFiltros = () => {
    setSearch("");
    setEstado("TODOS");
    setMaterial("TODOS");
    setPorcentaje("TODOS");
    setAncho("TODOS");
  };

  const excelColumns = [
    {
      header: "Codigo",
      value: (rollo) => rollo.codigoRollo,
    },
    {
      header: "Material",
      value: (rollo) => rollo.tipoPolarizado,
      width: 24,
    },
    {
      header: "Clasificacion",
      value: etiquetaDetalle,
    },
    {
      header: "Ancho",
      value: (rollo) => anchoLabel(rollo.ancho),
    },
    {
      header: "Estado",
      value: (rollo) => rollo.estado,
    },
    {
      header: "Metros originales",
      value: (rollo) => Number(rollo.largoOriginal || 0),
    },
    {
      header: "Metros disponibles",
      value: (rollo) => Number(rollo.largoDisponible || 0),
    },
    {
      header: "Metros consumidos",
      value: (rollo) =>
        Number(rollo.largoOriginal || 0) -
        Number(rollo.largoDisponible || 0),
    },
    {
      header: "Utilizacion %",
      value: (rollo) => {
        const original = Number(rollo.largoOriginal || 0);
        const disponible = Number(rollo.largoDisponible || 0);

        return original > 0
          ? Number((((original - disponible) / original) * 100).toFixed(1))
          : 0;
      },
    },
  ];

  if (loading) {
    return (
      <div className="p-8 text-slate-600">
        Cargando análisis de rollos...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Rollos en uso
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Material activo para cortes y control de consumo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={cargar}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw size={18} />
            Actualizar
          </button>
        </div>
      </div>

      {/* INDICADORES */}
      <div className="grid gap-5 md:grid-cols-4">
        <KpiCard
          title="Rollos"
          value={totalRollos}
          icon={<Package />}
          color="blue"
        />

        <KpiCard
          title="Metros disponibles"
          value={formatMetros(metrosDisponibles)}
          icon={<Ruler />}
          color="green"
        />

        <KpiCard
          title="Metros consumidos"
          value={formatMetros(metrosConsumidos)}
          icon={<TrendingDown />}
          color="orange"
        />

        <KpiCard
          title="Rollos críticos"
          value={alertas.length}
          icon={<AlertTriangle />}
          color="red"
        />
      </div>

      {/* ANALISIS */}
      <div className="grid gap-6 lg:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="text-blue-600" />
            <h2 className="text-lg font-bold">
              Top materiales consumidos
            </h2>
          </div>

          {topMateriales.length === 0 ? (
            <p className="text-slate-500">
              No hay consumo registrado.
            </p>
          ) : (
            <div className="space-y-4">
              {topMateriales.map((item) => {
                const width =
                  maxTop > 0 ? (item.metros / maxTop) * 100 : 0;

                return (
                  <div key={item.nombre}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">
                        {item.nombre}
                      </span>

                      <span className="font-bold text-blue-700">
                        {formatMetros(item.metros)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle className="text-red-600" />
            <h2 className="text-lg font-bold">
              Rollos próximos a agotarse
            </h2>
          </div>

          {alertas.length === 0 ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl">
              No hay rollos críticos.
            </div>
          ) : (
            <div className="space-y-3">
              {alertas.slice(0, 6).map((rollo) => (
                <div
                  key={rollo._id}
                  className="border border-red-100 bg-red-50 rounded-xl p-4 flex justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-800">
                      {rollo.codigoRollo}
                    </p>

                    <p className="text-sm text-slate-500">
                      {rollo.tipoPolarizado} {etiquetaDetalle(rollo)}
                    </p>
                  </div>

                  <span className="font-bold text-red-600">
                    {formatMetros(rollo.largoDisponible)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* FILTROS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="text-slate-600" />
          <h2 className="text-lg font-bold">
            Filtros de análisis
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search
              size={18}
              className="absolute left-3 top-3.5 text-slate-400"
            />

            <input
              type="text"
              placeholder="Buscar código o material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 pl-10 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <SelectFiltro value={estado} setValue={setEstado} options={estados} />

          <SelectFiltro value={material} setValue={setMaterial} options={materiales} />

          <SelectFiltro
            value={porcentaje}
            setValue={setPorcentaje}
            options={porcentajes}
            formatLabel={(value) =>
              value === "TODOS"
                ? value
                : etiquetaDetalle({
                    porcentaje: value,
                    tipoPolarizado:
                      material === "TODOS" ? "" : material,
                  })
            }
          />

          <SelectFiltro
            value={ancho}
            setValue={setAncho}
            options={anchos}
            formatLabel={anchoLabel}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Mostrando <strong>{filtrados.length}</strong> de{" "}
            <strong>{rollos.length}</strong> rollos
          </p>

          <button
            onClick={limpiarFiltros}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            <X size={16} />
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/80 p-6">
          <div>
          <h2 className="text-lg font-bold text-slate-800">
            Detalle de rollos
          </h2>

          <p className="text-slate-500 text-sm">
            Disponible, consumo y porcentaje de utilización por rollo
          </p>
          </div>

          <ExcelButton
            title="Detalle de Rollos en Uso"
            fileName="rollos-uso"
            sheetName="Uso"
            columns={excelColumns}
            rows={filtrados}
          />
        </div>

        {filtrados.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No hay rollos con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4 text-left">Código</th>
                  <th className="p-4 text-left">Material</th>
                  <th className="p-4 text-left">Clasificacion</th>
                  <th className="p-4 text-left">Ancho</th>
                  <th className="p-4 text-left">Estado</th>
                  <th className="p-4 text-left">Original</th>
                  <th className="p-4 text-left">Disponible</th>
                  <th className="p-4 text-left">Consumido</th>
                  <th className="p-4 text-left">Utilización</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((rollo) => {
                  const original = Number(rollo.largoOriginal || 0);
                  const disponible = Number(rollo.largoDisponible || 0);
                  const consumido = original - disponible;

                  const uso =
                    original > 0 ? (consumido / original) * 100 : 0;

                  return (
                    <tr
                      key={rollo._id}
                      className="border-b border-slate-200 hover:bg-slate-50"
                    >
                      <td className="p-4 font-semibold text-slate-800">
                        {rollo.codigoRollo}
                      </td>

                      <td className="p-4 text-slate-600">
                        {rollo.tipoPolarizado}
                      </td>

                      <td className="p-4 text-slate-600">
                        {etiquetaDetalle(rollo)}
                      </td>

                      <td className="p-4 text-slate-600">
                        {anchoLabel(rollo.ancho)}
                      </td>

                      <td className="p-4 text-slate-600">
                        <EstadoBadge estado={rollo.estado} />
                      </td>

                      <td className="p-4 text-slate-600">
                        {formatMetros(original)}
                      </td>

                      <td className="p-4">
                        {formatMetros(disponible)}
                      </td>

                      <td className="p-4 font-medium">
                        {formatMetros(consumido)}
                      </td>

                      <td className="p-4 min-w-[180px]">
                        <div className="flex items-center gap-3">
                          <div className="w-28 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                uso >= 85
                                  ? "bg-red-600"
                                  : uso >= 60
                                  ? "bg-orange-500"
                                  : "bg-blue-600"
                              }`}
                              style={{
                                width: `${Math.min(uso, 100)}%`
                              }}
                            />
                          </div>

                          <span className="font-semibold">
                            {uso.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RESUMEN */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">
              Promedio consumido por rollo
            </p>

            <h3 className="text-2xl font-bold text-slate-800">
              {formatMetros(promedioConsumo)}
            </h3>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Metros disponibles filtrados
            </p>

            <h3 className="text-2xl font-bold text-slate-800">
              {formatMetros(metrosDisponibles)}
            </h3>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Estado del inventario
            </p>

            <h3 className="text-2xl font-bold text-slate-800">
              {alertas.length > 0 ? "Revisar alertas" : "Estable"}
            </h3>
          </div>
        </div>
      </div>

    </div>
  );
}

function KpiCard({ title, value, icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700"
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-500 text-sm">
            {title}
          </p>

          <h2 className="text-2xl font-bold mt-1">
            {value}
          </h2>
        </div>

        <div className={`p-3 rounded-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SelectFiltro({
  value,
  setValue,
  options,
  suffix = "",
  formatLabel,
}) {
  return (
    <select
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
    >
      {options.map((item) => (
        <option key={item} value={item}>
          {item === "TODOS"
            ? item
            : formatLabel
            ? formatLabel(item)
            : `${item}${suffix}`}
        </option>
      ))}
    </select>
  );
}

function EstadoBadge({ estado }) {
  const style =
    estado === "USO"
      ? "bg-green-100 text-green-700"
      : estado === "RESERVA"
      ? "bg-yellow-100 text-yellow-700"
      : estado === "AGOTADO"
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {estado}
    </span>
  );
}

export default UsoPage;
