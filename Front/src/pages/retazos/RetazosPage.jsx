import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  PackageOpen,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  createRetazo,
  deleteRetazo,
  getRetazos,
} from "../../api/retazos.api";
import ExcelButton from "../../components/ui/ExcelButton";
import TablePagination from "../../components/ui/TablePagination";
import { usePagination } from "../../hooks/usePagination";
import {
  anchoLabel,
  anchoValue,
  anchosPulgadas,
} from "../../utils/anchos";
import {
  etiquetaClasificacion,
  etiquetaDetalle,
  etiquetaUnidad,
  materialesCatalogo,
  opcionesPorMaterial,
  sufijoUnidad,
  UNIDAD_NINGUNA,
  unidadDetalle,
  unidadPorMaterial,
} from "../../utils/materiales";
import AppModal from "../../components/ui/AppModal";

function RetazosPage() {
  const [retazos, setRetazos] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [open, setOpen] =
    useState(false);

  const [anchoPersonalizado, setAnchoPersonalizado] =
    useState(false);

  const [form, setForm] =
    useState({
      codigoRetazo: "",
      tipoPolarizado: "",
      porcentaje: "",
      unidadMedida: "PORCENTAJE",
      ancho: "1.52",
      largoOriginal: "",
      observaciones: "",
    });

  const cargar = async () => {
    try {
      const res = await getRetazos();
      setRetazos(res.data || []);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No fue posible cargar los retazos",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const res = await getRetazos();

        if (active) {
          setRetazos(res.data || []);
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No fue posible cargar los retazos",
        });
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

  const limpiar = () => {
    setForm({
      codigoRetazo: "",
      tipoPolarizado: "",
      porcentaje: "",
      unidadMedida: "PORCENTAJE",
      ancho: "1.52",
      largoOriginal: "",
      observaciones: "",
    });
    setAnchoPersonalizado(false);
  };

  const guardar = async () => {
    try {
      if (
        !form.tipoPolarizado ||
        form.porcentaje === "" ||
        !form.ancho ||
        !form.largoOriginal ||
        Number(form.ancho) <= 0 ||
        Number(form.largoOriginal) <= 0
      ) {
        return Swal.fire({
          icon: "warning",
          title: "Complete los datos del retazo",
        });
      }

      await createRetazo({
        ...form,
        porcentaje: Number(form.porcentaje),
        unidadMedida:
          form.unidadMedida ||
          unidadPorMaterial(form.tipoPolarizado),
        ancho: Number(form.ancho),
        largoOriginal: Number(Number(form.largoOriginal).toFixed(2)),
      });

      Swal.fire({
        icon: "success",
        title: "Retazo guardado",
      });

      setOpen(false);
      limpiar();
      cargar();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message ||
          "No fue posible guardar el retazo",
      });
    }
  };

  const descartar = async (retazo) => {
    const result = await Swal.fire({
      icon: "question",
      title: "Descartar retazo",
      text: `Desea descartar ${retazo.codigoRetazo}?`,
      showCancelButton: true,
      confirmButtonText: "Si, descartar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) {
      return;
    }

    await deleteRetazo(retazo._id);
    cargar();
  };

  const disponibles =
    retazos.filter(
      (retazo) =>
        retazo.estado === "DISPONIBLE"
    ).length;

  const metrosDisponibles =
    retazos.reduce(
      (acc, retazo) =>
        retazo.estado === "DISPONIBLE"
          ? acc + Number(retazo.largoDisponible || 0)
          : acc,
      0
    );
  const pagination = usePagination(retazos);

  const excelColumns = [
    {
      header: "Codigo",
      value: (retazo) => retazo.codigoRetazo,
    },
    {
      header: "Material",
      value: (retazo) => retazo.tipoPolarizado,
      width: 24,
    },
    {
      header: "Clasificacion",
      value: etiquetaDetalle,
    },
    {
      header: "Ancho",
      value: (retazo) => anchoLabel(retazo.ancho),
    },
    {
      header: "Largo original",
      value: (retazo) => Number(retazo.largoOriginal || 0),
    },
    {
      header: "Largo disponible",
      value: (retazo) => Number(retazo.largoDisponible || 0),
    },
    {
      header: "Estado",
      value: (retazo) => retazo.estado,
    },
    {
      header: "Observaciones",
      value: (retazo) => retazo.observaciones || "",
      width: 32,
    },
  ];

  if (loading) {
    return (
      <div className="p-8 text-slate-600">
        Cargando retazos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <PackageOpen size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Retazos disponibles
              </h1>
              <p className="text-sm text-slate-500">
                Sobrantes utiles para reutilizar en proximos cortes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
          >
            <Plus size={18} />
            Nuevo retazo
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Stat
          label="Retazos disponibles"
          value={disponibles}
        />
        <Stat
          label="Metros disponibles"
          value={`${metrosDisponibles.toFixed(2)} m`}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/80 p-6">
          <div className="flex items-center gap-2">
            <PackageOpen className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">
              Inventario de retazos
            </h2>
          </div>

          <ExcelButton
            title="Inventario de Retazos"
            fileName="retazos"
            sheetName="Retazos"
            columns={excelColumns}
            rows={retazos}
          />
        </div>

        {retazos.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No hay retazos registrados.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4 text-left">Codigo</th>
                  <th className="p-4 text-left">Material</th>
                  <th className="p-4 text-left">Clasificacion</th>
                  <th className="p-4 text-left">Ancho</th>
                  <th className="p-4 text-left">Largo</th>
                  <th className="p-4 text-left">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((retazo) => (
                  <tr
                    key={retazo._id}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    <td className="p-4 font-semibold text-slate-800">
                      {retazo.codigoRetazo}
                    </td>
                    <td className="p-4 text-slate-600">
                      {retazo.tipoPolarizado}
                    </td>
                    <td className="p-4 text-slate-600">
                      {etiquetaDetalle(retazo)}
                    </td>
                    <td className="p-4 text-slate-600">
                      {anchoLabel(retazo.ancho)}
                    </td>
                    <td className="p-4 font-semibold text-blue-700">
                      {Number(retazo.largoDisponible || 0).toFixed(2)} m
                    </td>
                    <td className="p-4 text-slate-600">
                      {retazo.estado}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => descartar(retazo)}
                        disabled={retazo.estado !== "DISPONIBLE"}
                        className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40"
                        title="Descartar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <TablePagination pagination={pagination} />
          </>
        )}
      </div>

      {open && (
        <AppModal
          title="Nuevo retazo"
          subtitle="Registra un sobrante disponible para futuros cortes"
          icon={PackageOpen}
          maxWidth="max-w-2xl"
          onClose={() => setOpen(false)}
        >
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Codigo"
                  value={form.codigoRetazo}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      codigoRetazo: value,
                    })
                  }
                />
                <label className="block">
                  <span className="text-sm text-slate-500">
                    Material
                  </span>
                  <select
                    value={form.tipoPolarizado}
                    onChange={(event) => {
                      const tipoPolarizado =
                        event.target.value;

                      setForm({
                        ...form,
                        tipoPolarizado,
                        unidadMedida:
                          unidadPorMaterial(tipoPolarizado),
                        porcentaje:
                          unidadPorMaterial(tipoPolarizado) ===
                          UNIDAD_NINGUNA
                            ? 0
                            : "",
                      });
                    }}
                    className="w-full border rounded-lg p-3 mt-1"
                  >
                    <option value="">
                      Seleccione...
                    </option>
                    {materialesCatalogo.map((grupo) => (
                      <optgroup
                        key={grupo.categoria}
                        label={grupo.categoria}
                      >
                        {grupo.materiales.map((item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm text-slate-500">
                    {etiquetaUnidad(unidadDetalle(form))}
                  </span>
                  {unidadDetalle(form) === UNIDAD_NINGUNA ? (
                    <div className="w-full border rounded-lg p-3 mt-1 bg-slate-100 text-slate-500">
                      Sin clasificacion
                    </div>
                  ) : (
                    <select
                      value={form.porcentaje}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          porcentaje:
                            event.target.value,
                          unidadMedida:
                            unidadDetalle(form),
                        })
                      }
                      className="w-full border rounded-lg p-3 mt-1"
                    >
                      <option value="">
                        {sufijoUnidad(unidadDetalle(form))}
                      </option>
                      {opcionesPorMaterial(form.tipoPolarizado).map((item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {etiquetaClasificacion(
                            item,
                            unidadDetalle(form)
                          )}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
                <label className="block">
                  <span className="text-sm text-slate-500">
                    Ancho del retazo (m)
                  </span>
                  <select
                    value={anchoPersonalizado ? "OTRO" : form.ancho}
                    onChange={(event) => {
                      const value = event.target.value;

                      if (value === "OTRO") {
                        setAnchoPersonalizado(true);
                        setForm({ ...form, ancho: "" });
                        return;
                      }

                      setAnchoPersonalizado(false);
                      setForm({ ...form, ancho: value });
                    }}
                    className="mt-1 w-full rounded-lg border p-3"
                  >
                    {anchosPulgadas.map((item) => (
                      <option
                        key={item.value}
                        value={anchoValue(item.value)}
                      >
                        {item.label} ({anchoValue(item.value)} m)
                      </option>
                    ))}
                    <option value="OTRO">Otro ancho</option>
                  </select>
                  {anchoPersonalizado && (
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Ej: 1.45"
                      value={form.ancho}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          ancho: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-lg border p-3"
                    />
                  )}
                </label>
                <Input
                  label="Largo disponible (m)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={form.largoOriginal}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      largoOriginal: value,
                    })
                  }
                />
              </div>

              <label className="block">
                <span className="text-sm text-slate-500">
                  Observaciones
                </span>
                <textarea
                  rows="3"
                  value={form.observaciones}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      observaciones: event.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-3 mt-1"
                />
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2 border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardar}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Save size={18} />
                  Guardar
                </button>
              </div>
            </div>
        </AppModal>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="metric-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-slate-500 text-sm">
        {label}
      </p>
      <h2 className="metric-value font-bold mt-1">
        {value}
      </h2>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  min,
  step,
  inputMode,
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type={type}
        min={min}
        step={step}
        inputMode={inputMode}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      />
    </label>
  );
}

export default RetazosPage;
