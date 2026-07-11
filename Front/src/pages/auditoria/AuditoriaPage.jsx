import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Filter,
  Layers,
  RotateCcw,
  Ruler,
  Search,
} from "lucide-react";
import Swal from "sweetalert2";

import { getCortes } from "../../api/cortes.api";
import { getVentas } from "../../api/ventas.api";
import ExcelButton from "../../components/ui/ExcelButton";
import { etiquetaDetalle } from "../../utils/materiales";

const formatoCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const servicioLabels = {
  POLARIZADO: "Polarizado",
  PPF: "PPF",
  PELICULA_SEGURIDAD: "Pelicula de seguridad",
  VENTA: "Venta",
  GARANTIA: "Garantia",
  GARANTIA_INSTALADOR: "Garantia instalador",
  GARANTIA_EMPRESA: "Garantia empresa",
};

const estadoLabels = {
  SIN_VENTA: "SIN VENTA",
  PENDIENTE: "VENTA PENDIENTE",
  PAGADA: "PAGADA",
  ANULADA: "ANULADA",
};

const PAGE_SIZE = 8;

const filtrosEstado = [
  ["TODOS", "Todos"],
  ["SIN_VENTA", "Sin venta"],
  ["PENDIENTE", "Pendiente"],
  ["PAGADA", "Pagada"],
  ["ANULADA", "Anulada"],
];

const filtrosTrabajo = [
  ["TODOS", "Todos"],
  ["GARANTIAS", "Garantias"],
  ["GARANTIA_INSTALADOR", "Garantia instalador"],
];

function AuditoriaPage() {
  const [cortes, setCortes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("TODOS");
  const [materialFiltro, setMaterialFiltro] = useState("TODOS");
  const [tipoTrabajo, setTipoTrabajo] = useState("TODOS");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    let active = true;

    const cargar = async () => {
      try {
        const [cortesRes, ventasRes] =
          await Promise.all([getCortes(), getVentas()]);

        if (active) {
          setCortes(cortesRes.data || []);
          setVentas(ventasRes.data || []);
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "Error cargando auditoria",
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    cargar();

    return () => {
      active = false;
    };
  }, []);

  const ventasPorId = useMemo(() => {
    const map = new Map();
    ventas.forEach((venta) => map.set(venta._id, venta));
    return map;
  }, [ventas]);

  const filas = useMemo(() => {
    return cortes.map((corte) =>
      crearFilaAuditoria(corte, ventasPorId)
    );
  }, [cortes, ventasPorId]);

  const materialesFiltro = useMemo(() => {
    return [
      "TODOS",
      ...valoresUnicos(filas.map((fila) => fila.material)).sort(),
    ];
  }, [filas]);

  const filasFiltradas = useMemo(() => {
    const texto = search.toLowerCase();

    return filas.filter((fila) => {
      const coincideFiltro =
        filtro === "TODOS" || fila.estadoClave === filtro;
      const coincidePeriodo =
        estaEnRangoFecha(fila.fecha, fechaDesde, fechaHasta);
      const coincideTipoTrabajo =
        filtrarTipoTrabajo(fila, tipoTrabajo);
      const coincideMaterial =
        materialFiltro === "TODOS" ||
        fila.material === materialFiltro;
      const textoFila = [
        fila.placa,
        fila.fechaTexto,
        fila.vehiculo,
        fila.material,
        fila.corte,
        fila.servicio,
        fila.instalador,
        fila.codigoVenta,
        fila.cliente,
      ]
        .join(" ")
        .toLowerCase();

      return (
        coincideFiltro &&
        coincidePeriodo &&
        coincideTipoTrabajo &&
        coincideMaterial &&
        textoFila.includes(texto)
      );
    });
  }, [
    filas,
    fechaDesde,
    fechaHasta,
    filtro,
    materialFiltro,
    search,
    tipoTrabajo,
  ]);

  useEffect(() => {
    setPagina(1);
  }, [
    fechaDesde,
    fechaHasta,
    filtro,
    materialFiltro,
    search,
    tipoTrabajo,
  ]);

  const resumen = useMemo(() => {
    const cantidadMaterial =
      filasFiltradas.reduce(
        (acc, fila) => acc + fila.cantidadMaterial,
        0
      );
    const costoMaterial =
      filasFiltradas.reduce(
        (acc, fila) => acc + fila.costoMaterial,
        0
      );
    const venta =
      filasFiltradas.reduce(
        (acc, fila) => acc + fila.costoVenta,
        0
      );
    const utilidad = venta - costoMaterial;

    return {
      total: filasFiltradas.length,
      cantidadMaterial,
      costoMaterial,
      venta,
      utilidad,
      pendientes:
        filasFiltradas.filter(
          (fila) => fila.estadoClave === "SIN_VENTA"
        ).length,
    };
  }, [filasFiltradas]);

  const resumenMateriales = useMemo(
    () => crearResumenMateriales(filasFiltradas),
    [filasFiltradas]
  );

  const gruposTabla = useMemo(
    () => agruparAuditoriaVisual(filasFiltradas),
    [filasFiltradas]
  );

  const totalPaginas =
    Math.max(Math.ceil(gruposTabla.length / PAGE_SIZE), 1);

  const gruposPaginados = useMemo(() => {
    const inicio =
      (pagina - 1) * PAGE_SIZE;

    return gruposTabla.slice(inicio, inicio + PAGE_SIZE);
  }, [gruposTabla, pagina]);

  const filtrosActivos = [
    fechaDesde,
    fechaHasta,
    materialFiltro !== "TODOS" ? materialFiltro : "",
    filtro !== "TODOS" ? filtro : "",
    tipoTrabajo !== "TODOS" ? tipoTrabajo : "",
    search,
  ].filter(Boolean).length;

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setMaterialFiltro("TODOS");
    setFiltro("TODOS");
    setTipoTrabajo("TODOS");
    setSearch("");
  };

  const excelColumns = [
    {
      header: "Fecha",
      value: (fila) => fila.fechaTexto,
    },
    {
      header: "Placa",
      value: (fila) => fila.placa,
    },
    {
      header: "Vehiculo",
      value: (fila) => fila.vehiculo,
      width: 24,
    },
    {
      header: "Cliente",
      value: (fila) => fila.cliente,
      width: 24,
    },
    {
      header: "Corte",
      value: (fila) => fila.corte,
      width: 26,
    },
    {
      header: "Servicio",
      value: (fila) => fila.servicio,
    },
    {
      header: "Instalador",
      value: (fila) => fila.instalador,
      width: 22,
    },
    {
      header: "Cantidad material",
      value: (fila) => fila.cantidadMaterial,
    },
    {
      header: "Material",
      value: (fila) => fila.material,
      width: 24,
    },
    {
      header: "Costo material",
      value: (fila) => fila.costoMaterial,
    },
    {
      header: "Costo venta",
      value: (fila) => fila.costoVenta,
    },
    {
      header: "Utilidad",
      value: (fila) => fila.utilidad,
    },
    {
      header: "Estado",
      value: (fila) => fila.estado,
    },
    {
      header: "Venta",
      value: (fila) => fila.codigoVenta,
    },
  ];

  if (loading) {
    return (
      <div className="p-8 text-slate-600">
        Cargando auditoria...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Auditoria comercial
          </h1>
          <p className="text-slate-500">
            Costos de material, venta y utilidad por material, agrupando datos repetidos del carro.
          </p>
        </div>

        <ExcelButton
          title="Auditoria comercial"
          fileName="auditoria-comercial"
          sheetName="Auditoria"
          columns={excelColumns}
          rows={filasFiltradas}
        />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Resumen
          icon={ClipboardList}
          label="Cortes auditados"
          value={resumen.total}
          color="text-blue-700"
        />
        <Resumen
          icon={Ruler}
          label="Material consumido"
          value={formatoMetros(resumen.cantidadMaterial)}
          color="text-indigo-700"
        />
        <Resumen
          icon={BadgeDollarSign}
          label="Costo material"
          value={formatoCop.format(resumen.costoMaterial)}
          color="text-slate-800"
        />
        <Resumen
          icon={CheckCircle2}
          label="Costo venta"
          value={formatoCop.format(resumen.venta)}
          color="text-green-700"
        />
        <Resumen
          icon={AlertTriangle}
          label="Faltan por venta"
          value={resumen.pendientes}
          color="text-red-700"
        />
      </div>

      <section className="bg-white rounded-2xl shadow overflow-hidden">
        <PanelFiltrosAuditoria
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          filtro={filtro}
          filtrosActivos={filtrosActivos}
          materialFiltro={materialFiltro}
          materialesFiltro={materialesFiltro}
          search={search}
          tipoTrabajo={tipoTrabajo}
          onFechaDesde={setFechaDesde}
          onFechaHasta={setFechaHasta}
          onFiltro={setFiltro}
          onLimpiar={limpiarFiltros}
          onMaterialFiltro={setMaterialFiltro}
          onSearch={setSearch}
          onTipoTrabajo={setTipoTrabajo}
        />

        <ResumenMateriales materiales={resumenMateriales} />

        <div className="divide-y divide-slate-200">
          {gruposTabla.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hay informacion para este filtro.
            </div>
          ) : (
            gruposPaginados.map((grupo) => (
              <article
                key={grupo.id}
                className="bg-white"
              >
                <div className="bg-white px-5 py-4 grid gap-4 lg:grid-cols-[minmax(240px,1.3fr)_minmax(300px,1fr)_minmax(190px,auto)] lg:items-center">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {grupo.fechaTexto}
                      </span>
                      <EstadoBadge estado={grupo.estadoClave}>
                        {grupo.estado}
                      </EstadoBadge>
                    </div>
                    <p className="truncate text-lg font-bold text-slate-800">
                      {grupo.placa} - {grupo.vehiculo}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {grupo.cliente || "Cliente sin registrar"}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <DatoGrupo
                      label="Costo material"
                      value={formatoCop.format(grupo.costoMaterial)}
                    />
                    <DatoGrupo
                      label="Venta carro"
                      value={
                        grupo.costoVenta > 0
                          ? formatoCop.format(grupo.costoVenta)
                          : "-"
                      }
                    />
                    <DatoGrupo
                      label="Utilidad"
                      value={
                        grupo.costoVenta > 0
                          ? formatoCop.format(grupo.utilidad)
                          : "-"
                      }
                      color={
                        grupo.utilidad < 0
                          ? "text-red-700"
                          : "text-green-700"
                      }
                    />
                  </div>

                  <div className="flex flex-col items-start gap-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 lg:items-end lg:text-right">
                    <p className="font-semibold text-slate-700">
                      {grupo.codigoVenta || "Sin venta"}
                    </p>
                    <p>
                      {grupo.ultimoCambio || "-"}
                    </p>
                    {grupo.instaladores && (
                      <p>
                        Instalador: {grupo.instaladores}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="p-3 text-left">Corte</th>
                          <th className="p-3 text-left">Servicio</th>
                          <th className="p-3 text-left">Instalador</th>
                          <th className="p-3 text-right">Cantidad</th>
                          <th className="p-3 text-left">Material</th>
                          <th className="p-3 text-right">Costo material</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.filas.map((fila) => (
                          <tr
                            key={fila.id}
                            className="border-t hover:bg-slate-50"
                          >
                            <td className="p-3 font-medium text-slate-700">
                              {fila.corte}
                            </td>
                            <td className="p-3">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                {fila.servicio}
                              </span>
                            </td>
                            <td className="p-3">
                              {fila.instalador || "-"}
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {fila.cantidadMaterialTexto}
                            </td>
                            <td className="p-3 text-slate-600">
                              {fila.material}
                            </td>
                            <td className="p-3 text-right font-semibold text-slate-800">
                              {formatoCop.format(fila.costoMaterial)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {gruposTabla.length > 0 && (
          <div className="p-4 border-t flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-slate-500">
              Mostrando {gruposPaginados.length} de {gruposTabla.length} grupos
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPagina((actual) => Math.max(actual - 1, 1))
                }
                disabled={pagina === 1}
                className="px-3 py-2 rounded-lg border text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Anterior
              </button>
              <span className="px-3 py-2 text-slate-600">
                Pagina {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPagina((actual) =>
                    Math.min(actual + 1, totalPaginas)
                  )
                }
                disabled={pagina === totalPaginas}
                className="px-3 py-2 rounded-lg border text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Resumen({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center gap-3">
        <Icon className={color} size={22} />
        <p className="text-sm text-slate-500">
          {label}
        </p>
      </div>
      <p className={`mt-3 text-2xl font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
}

function DatoGrupo({
  label,
  value,
  color = "text-slate-800",
}) {
  return (
    <div>
      <p className="text-slate-500">
        {label}
      </p>
      <p className={`mt-1 font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
}

function PanelFiltrosAuditoria({
  fechaDesde,
  fechaHasta,
  filtro,
  filtrosActivos,
  materialFiltro,
  materialesFiltro,
  search,
  tipoTrabajo,
  onFechaDesde,
  onFechaHasta,
  onFiltro,
  onLimpiar,
  onMaterialFiltro,
  onSearch,
  onTipoTrabajo,
}) {
  return (
    <div className="border-b bg-slate-50/70">
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Filter size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">
              Filtros de auditoria
            </h2>
            <p className="text-xs text-slate-500">
              {filtrosActivos} activos
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLimpiar}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          <RotateCcw size={16} />
          Limpiar filtros
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid xl:grid-cols-[minmax(280px,1fr)_180px_180px_minmax(240px,360px)] gap-4">
          <BuscadorAuditoria
            value={search}
            onChange={onSearch}
          />

          <FechaInput
            label="Desde"
            value={fechaDesde}
            onChange={onFechaDesde}
          />
          <FechaInput
            label="Hasta"
            value={fechaHasta}
            onChange={onFechaHasta}
          />
          <MaterialSelect
            value={materialFiltro}
            options={materialesFiltro}
            onChange={onMaterialFiltro}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <FiltroSegmentado
            icon={CheckCircle2}
            label="Estado de venta"
            value={filtro}
            options={filtrosEstado}
            onChange={onFiltro}
            activeClass="bg-blue-600 text-white border-blue-600"
          />

          <FiltroSegmentado
            icon={Layers}
            label="Tipo de trabajo"
            value={tipoTrabajo}
            options={filtrosTrabajo}
            onChange={onTipoTrabajo}
            activeClass="bg-amber-500 text-white border-amber-500"
          />
        </div>
      </div>
    </div>
  );
}

function BuscadorAuditoria({ value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">
        Busqueda
      </span>
      <div className="relative mt-1">
        <Search
          size={18}
          className="absolute left-3 top-3.5 text-slate-400"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Placa, cliente, material, venta..."
          className="w-full border rounded-xl p-3 pl-10 bg-white"
        />
      </div>
    </label>
  );
}

function MaterialSelect({ value, options, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">
        Material
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full border rounded-xl p-3 bg-white"
      >
        {options.map((material) => (
          <option key={material} value={material}>
            {material === "TODOS"
              ? "Todos los materiales"
              : material}
          </option>
        ))}
      </select>
    </label>
  );
}

function FiltroSegmentado({
  icon: Icon,
  label,
  value,
  options,
  onChange,
  activeClass,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
        <Icon size={17} className="text-slate-400" />
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
              value === optionValue
                ? activeClass
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function FechaInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">
        {label}
      </span>
      <div className="relative mt-1">
        <CalendarDays
          size={18}
          className="absolute left-3 top-3.5 text-slate-400 pointer-events-none"
        />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border rounded-xl py-3 pl-10 pr-3 bg-white"
        />
      </div>
    </label>
  );
}

function EstadoBadge({ estado, children }) {
  const styles = {
    SIN_VENTA: "bg-red-100 text-red-700",
    PENDIENTE: "bg-yellow-100 text-yellow-700",
    PAGADA: "bg-green-100 text-green-700",
    ANULADA: "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        styles[estado] || styles.SIN_VENTA
      }`}
    >
      {children}
    </span>
  );
}

function ResumenMateriales({ materiales }) {
  if (!materiales.length) {
    return null;
  }

  return (
    <div className="border-t bg-slate-50 px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-800">
            Resumen por material
          </h3>
          <p className="text-xs text-slate-500">
            Valores filtrados
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-white text-slate-500">
            <tr>
              <th className="p-3 text-left">Material</th>
              <th className="p-3 text-right">Cortes</th>
              <th className="p-3 text-right">Consumido</th>
              <th className="p-3 text-right">Costo material</th>
              <th className="p-3 text-right">Costo venta</th>
              <th className="p-3 text-right">Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {materiales.map((material) => (
              <tr
                key={material.material}
                className="border-t border-slate-200 bg-white"
              >
                <td className="p-3 font-semibold text-slate-700">
                  {material.material}
                </td>
                <td className="p-3 text-right">
                  {material.cortes}
                </td>
                <td className="p-3 text-right font-semibold">
                  {formatoMetros(material.cantidadMaterial)}
                </td>
                <td className="p-3 text-right">
                  {formatoCop.format(material.costoMaterial)}
                </td>
                <td className="p-3 text-right">
                  {formatoCop.format(material.costoVenta)}
                </td>
                <td
                  className={`p-3 text-right font-semibold ${
                    material.utilidad < 0
                      ? "text-red-700"
                      : "text-green-700"
                  }`}
                >
                  {formatoCop.format(material.utilidad)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function filtrarTipoTrabajo(fila, tipoTrabajo) {
  if (tipoTrabajo === "TODOS") {
    return true;
  }

  if (tipoTrabajo === "GARANTIAS") {
    return String(fila.tipoServicio || "").includes("GARANTIA");
  }

  return fila.tipoServicio === tipoTrabajo;
}

function crearResumenMateriales(filas) {
  const map = new Map();

  filas.forEach((fila) => {
    const key = fila.material || "Material";

    if (!map.has(key)) {
      map.set(key, {
        material: key,
        cortes: 0,
        cantidadMaterial: 0,
        costoMaterial: 0,
        costoVenta: 0,
        utilidad: 0,
      });
    }

    const actual = map.get(key);
    actual.cortes += 1;
    actual.cantidadMaterial += Number(fila.cantidadMaterial || 0);
    actual.costoMaterial += Number(fila.costoMaterial || 0);
    actual.costoVenta += Number(fila.costoVenta || 0);
    actual.utilidad = actual.costoVenta - actual.costoMaterial;
  });

  return Array.from(map.values()).sort(
    (a, b) => b.cantidadMaterial - a.cantidadMaterial
  );
}

function crearFilaAuditoria(corte, ventasPorId) {
  const ventaId =
    corte.ventaId?._id || corte.ventaId;
  const venta =
    corte.ventaId?._id
      ? corte.ventaId
      : ventasPorId.get(ventaId);
  const estadoClave =
    corte.ventaEstado ||
    venta?.estado ||
    (Number(corte.valorVenta || 0) > 0
      ? "PENDIENTE"
      : "SIN_VENTA");
  const costoMaterial =
    Number(corte.costoMaterialCop || 0);
  const costoVenta =
    Number(corte.valorVenta || 0);
  const auditoria =
    ultimaAuditoria([
      ...(corte.auditoria || []),
      ...(venta?.auditoria || []),
    ]);

  return {
    id: corte._id,
    fecha:
      fechaDia(corte.createdAt || corte.fecha),
    fechaTexto:
      formatearFechaDia(corte.createdAt || corte.fecha),
    placa: corte.placa || "-",
    vehiculo:
      `${corte.marca || ""} ${corte.modelo || ""}`.trim() || "-",
    cliente:
      venta?.cliente?.nombre || "",
    corte:
      corte.tipoCorte || "-",
    tipoServicio:
      corte.tipoServicio || "",
    servicio:
      servicioLabels[corte.tipoServicio] ||
      corte.tipoServicio ||
      "",
    instalador:
      corte.instalador || "",
    cantidadMaterial:
      Number(corte.metrosUtilizados || 0),
    cantidadMaterialTexto:
      `${Number(corte.metrosUtilizados || 0).toFixed(2)} m`,
    material:
      descripcionMaterial(corte),
    costoMaterial,
    costoVenta,
    utilidad:
      costoVenta - costoMaterial,
    estadoClave,
    estado:
      estadoLabels[estadoClave] || estadoClave,
    codigoVenta:
      corte.codigoVenta || venta?.codigoVenta || "",
    ventaTotal:
      Number(venta?.total || 0),
    ultimoCambio:
      auditoria
        ? `${auditoria.accion} - ${auditoria.usuarioNombre || "SISTEMA"}`
        : "",
  };
}

function formatoMetros(value) {
  return `${Number(value || 0).toFixed(2)} m`;
}

function agruparAuditoriaVisual(filas) {
  const grupos = new Map();

  filas.forEach((fila) => {
    const key = claveGrupoVisual(fila);

    if (!grupos.has(key)) {
      grupos.set(key, {
        id: key,
        fechaTexto:
          fila.fechaTexto,
        placa:
          fila.placa,
        vehiculo:
          fila.vehiculo,
        cliente:
          fila.cliente,
        instaladores:
          "",
        filas: [],
      });
    }

    grupos.get(key).filas.push(fila);
  });

  return Array.from(grupos.values()).map((grupo) => {
    const filasGrupo =
      grupo.filas;
    const costoMaterialGrupo =
      filasGrupo.reduce(
        (acc, item) => acc + Number(item.costoMaterial || 0),
        0
      );
    const costoVentaGrupo =
      filasGrupo.reduce(
        (acc, item) => acc + Number(item.costoVenta || 0),
        0
      );
    const estadoClaveGrupo =
      resolverEstadoGrupo(
        filasGrupo.map((item) => item.estadoClave)
      );
    const codigoVentaGrupo =
      valoresUnicos(
        filasGrupo.map((item) => item.codigoVenta)
      ).join(", ");
    const ultimoCambioGrupo =
      valoresUnicos(
        filasGrupo.map((item) => item.ultimoCambio)
      )[0] || "";
    const ventaTotalGrupo =
      totalVentasUnicas(filasGrupo);
    const instaladores =
      valoresUnicos(
        filasGrupo.map((item) => item.instalador)
      ).join(", ");

    return {
      ...grupo,
      instaladores,
      costoMaterial:
        Math.round(costoMaterialGrupo),
      costoVenta:
        Math.round(costoVentaGrupo),
      utilidad:
        Math.round(costoVentaGrupo - costoMaterialGrupo),
      estadoClave:
        estadoClaveGrupo,
      estado:
        estadoLabels[estadoClaveGrupo] || estadoClaveGrupo,
      codigoVenta:
        codigoVentaGrupo,
      ultimoCambio:
        ultimoCambioGrupo,
      ventaTotal:
        ventaTotalGrupo,
    };
  });
}

function valoresUnicos(values) {
  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );
}

function resolverEstadoGrupo(estados) {
  if (estados.includes("SIN_VENTA")) {
    return "SIN_VENTA";
  }

  if (estados.includes("PENDIENTE")) {
    return "PENDIENTE";
  }

  if (estados.includes("PAGADA")) {
    return "PAGADA";
  }

  return estados[0] || "SIN_VENTA";
}

function totalVentasUnicas(filas) {
  const ventas = new Map();

  filas.forEach((fila) => {
    const key =
      fila.codigoVenta || fila.id;

    if (!ventas.has(key)) {
      ventas.set(key, Number(fila.ventaTotal || 0));
    }
  });

  return Array.from(ventas.values()).reduce(
    (acc, value) => acc + value,
    0
  );
}

function claveGrupoVisual(fila) {
  return [
    fila.fecha,
    fila.placa,
    fila.vehiculo,
    fila.cliente,
  ]
    .join("|")
    .toUpperCase();
}

function fechaDia(value) {
  if (!value) {
    return "";
  }

  const fecha = new Date(value);
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function estaEnRangoFecha(fecha, desde, hasta) {
  if (!desde && !hasta) {
    return true;
  }

  const fechaItem =
    fechaDesdeClave(fecha);

  if (!fechaItem) {
    return false;
  }

  const inicio = desde
    ? new Date(`${desde}T00:00:00`)
    : null;
  const fin = hasta
    ? new Date(`${hasta}T23:59:59`)
    : null;

  if (inicio && fechaItem < inicio) {
    return false;
  }

  if (fin && fechaItem > fin) {
    return false;
  }

  return true;
}

function fechaDesdeClave(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const fecha = new Date(value);
    fecha.setHours(0, 0, 0, 0);
    return fecha;
  }

  const [year, month, day] =
    String(value).split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatearFechaDia(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("es-CO");
}

function ultimaAuditoria(items) {
  return items
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.fecha || 0) - new Date(a.fecha || 0)
    )[0];
}

function descripcionMaterial(corte) {
  const material = corte.rolloId || corte.retazoId || {};
  const detalle = etiquetaDetalle(material);
  const tipo =
    material.tipoPolarizado ||
    servicioLabels[corte.tipoServicio] ||
    "Material";

  return `${tipo} ${detalle || ""}`.trim();
}

export default AuditoriaPage;
