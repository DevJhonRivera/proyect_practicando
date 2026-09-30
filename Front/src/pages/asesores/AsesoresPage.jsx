import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Boxes, ClipboardPlus, Search } from "lucide-react";
import Swal from "sweetalert2";

import { getCatalogoDisponible } from "../../api/asesores.api";
import { anchoLabel } from "../../utils/anchos";
import { usePagination } from "../../hooks/usePagination";
import TablePagination from "../../components/ui/TablePagination";
import AsesoriaFormModal from "./AsesoriaFormModal";
import AsesoriasHistorial from "./AsesoriasHistorial";

const formatoMetros = (value) => `${Number(value || 0).toFixed(2)} m`;

const etiquetaClasificacion = (material) => {
  if (material.unidadMedida === "NINGUNA") return "Sin clasificación";
  if (material.unidadMedida === "MICRAS") {
    return `${material.porcentaje || 0} micras`;
  }
  return `${material.porcentaje || 0}%`;
};

function AsesoresPage() {
  const [materiales, setMateriales] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [nuevaRecepcion, setNuevaRecepcion] = useState(false);
  const [historialVersion, setHistorialVersion] = useState(0);

  const cargar = async () => {
    try {
      const response = await getCatalogoDisponible();
      setMateriales(response.data?.data || []);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible cargar la disponibilidad",
        text: error.response?.data?.message || "Intente nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const materialesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return materiales;

    return materiales.filter((material) =>
      [
        material.tipoPolarizado,
        etiquetaClasificacion(material),
        anchoLabel(material.ancho),
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto)
    );
  }, [materiales, busqueda]);

  const pagination = usePagination(materialesFiltrados);
  const metrosTotales = materiales.reduce(
    (total, material) => total + Number(material.metrosDisponibles || 0),
    0
  );
  const rollosTotales = materiales.reduce(
    (total, material) => total + Number(material.cantidadRollos || 0),
    0
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/80 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Boxes size={23} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Catálogo para asesores</h1>
              <p className="text-sm text-slate-500">Consulta qué material está disponible para ofrecer al cliente.</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setNuevaRecepcion(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <ClipboardPlus size={18} />
              Nueva recepción
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar material, clasificación o ancho..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-slate-600">{rollosTotales} rollos</span>
            <span className="rounded-xl bg-blue-50 px-3 py-2 font-semibold text-blue-700">{metrosTotales.toFixed(2)} m</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Cargando disponibilidad...</div>
        ) : pagination.pageItems.length === 0 ? (
          <div className="p-10 text-center">
            <Boxes size={48} className="mx-auto text-slate-300" />
            <p className="mt-3 text-slate-500">No hay material disponible para mostrar.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-4 text-left">Material</th>
                    <th className="p-4 text-left">Clasificación</th>
                    <th className="p-4 text-left">Ancho</th>
                    <th className="p-4 text-left">Disponibles</th>
                    <th className="p-4 text-left">Metros disponibles</th>
                    <th className="p-4 text-left">Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.pageItems.map((material, index) => (
                    <tr key={`${material.tipoPolarizado}-${material.ancho}-${material.porcentaje}-${index}`} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-800">{material.tipoPolarizado}</td>
                      <td className="p-4 text-slate-600">{etiquetaClasificacion(material)}</td>
                      <td className="p-4 text-slate-600">{anchoLabel(material.ancho)}</td>
                      <td className="p-4 font-semibold text-slate-700">{material.cantidadRollos} rollos{material.cantidadRetazos ? ` / ${material.cantidadRetazos} retazos` : ""}</td>
                      <td className="p-4 font-semibold text-blue-700">{formatoMetros(material.metrosDisponibles)}</td>
                      <td className="p-4 text-slate-600">{material.enReserva} en reserva / {material.enUso} en uso</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination pagination={pagination} />
          </>
        )}
      </section>

      <AsesoriasHistorial refreshKey={historialVersion} />

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <BadgeDollarSign size={16} className="text-blue-600" />
        Los precios se registran desde el módulo de ventas según el servicio ofrecido.
      </div>

      {nuevaRecepcion && (
        <AsesoriaFormModal
          onClose={() => setNuevaRecepcion(false)}
          onSaved={() => setHistorialVersion((value) => value + 1)}
        />
      )}
    </div>
  );
}

export default AsesoresPage;
