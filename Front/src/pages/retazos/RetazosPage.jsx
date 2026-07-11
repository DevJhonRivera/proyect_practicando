import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  PackageOpen,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  createRetazo,
  deleteRetazo,
  getRetazos,
} from "../../api/retazos.api";
import ExcelButton from "../../components/ui/ExcelButton";
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

function RetazosPage() {
  const [retazos, setRetazos] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [open, setOpen] =
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
  };

  const guardar = async () => {
    try {
      if (
        !form.tipoPolarizado ||
        form.porcentaje === "" ||
        !form.ancho ||
        !form.largoOriginal
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
        largoOriginal: Number(form.largoOriginal),
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Retazos disponibles
          </h1>
          <p className="text-slate-500">
            Sobrantes utiles para reutilizar en proximos cortes.
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2"
        >
          <Plus size={18} />
          Nuevo retazo
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Stat
          label="Retazos disponibles"
          value={disponibles}
        />
        <Stat
          label="Metros disponibles"
          value={`${metrosDisponibles.toFixed(2)} m`}
        />
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PackageOpen className="text-blue-600" />
            <h2 className="text-lg font-bold">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
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
                {retazos.map((retazo) => (
                  <tr
                    key={retazo._id}
                    className="border-t hover:bg-slate-50"
                  >
                    <td className="p-4 font-semibold">
                      {retazo.codigoRetazo}
                    </td>
                    <td className="p-4">
                      {retazo.tipoPolarizado}
                    </td>
                    <td className="p-4">
                      {etiquetaDetalle(retazo)}
                    </td>
                    <td className="p-4">
                      {anchoLabel(retazo.ancho)}
                    </td>
                    <td className="p-4 font-semibold text-blue-700">
                      {Number(retazo.largoDisponible || 0).toFixed(2)} m
                    </td>
                    <td className="p-4">
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
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">
                Nuevo retazo
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
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
                    Ancho
                  </span>
                  <select
                    value={form.ancho}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        ancho: event.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 mt-1"
                  >
                    {anchosPulgadas.map((item) => (
                      <option
                        key={item.value}
                        value={anchoValue(item.value)}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Largo disponible"
                  type="number"
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
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <p className="text-slate-500 text-sm">
        {label}
      </p>
      <h2 className="text-3xl font-bold mt-1">
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
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full border rounded-lg p-3 mt-1"
      />
    </label>
  );
}

export default RetazosPage;
