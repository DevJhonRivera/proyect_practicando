import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  Car,
  Edit3,
  Plus,
  Search,
  Shield,
  Trash2,
} from "lucide-react";

import {
  createPiezaPpf,
  deletePiezaPpf,
  getPiezasPpf,
  updatePiezaPpf,
} from "../../api/piezasPpf.api";
import ExcelButton from "../../components/ui/ExcelButton";
import TablePagination from "../../components/ui/TablePagination";
import { usePagination } from "../../hooks/usePagination";

const piezasExteriores = [
  "PUERTAS",
  "BOMPER DELANTERO",
  "BOMPER TRASERO",
  "TECHO",
  "SPOILER",
  "PARALES",
  "STOPS",
  "RETROVISORES",
  "TRIANGULOS",
  "FAROLAS",
  "CAPOT",
  "BAUL",
  "GUARDAFANGOS",
  "ESTRIBOS",
  "MANIJAS",
  "OTRA",
];

const piezasInteriores = [
  "PANTALLA",
  "CAJA CAMBIOS",
  "NEGRO PIANO",
  "CONSOLA CENTRAL",
  "TABLERO",
  "BOTONERA",
  "MOLDURAS",
  "PUERTAS INTERIORES",
  "OTRA",
];

const formInicial = {
  marca: "",
  modelo: "",
  ubicacion: "EXTERIOR",
  pieza: "",
  piezaPersonalizada: "",
  anchoCm: "",
  largoCm: "",
  cantidad: "1",
  observaciones: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50";

const mayusculas = (value) =>
  String(value || "").toUpperCase();

const soloNumeros = (value) =>
  String(value || "").replace(/\D/g, "");

const piezaFinal = (form) =>
  form.pieza === "OTRA"
    ? mayusculas(form.piezaPersonalizada)
    : form.pieza;

function PiezasPpfPage() {
  const [piezas, setPiezas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("TODAS");
  const [filtroModelo, setFiltroModelo] = useState("TODOS");
  const [filtroUbicacion, setFiltroUbicacion] = useState("TODAS");
  const [mantenerCarro, setMantenerCarro] = useState(false);
  const [form, setForm] = useState(formInicial);

  const cargar = async () => {
    try {
      const res = await getPiezasPpf();
      setPiezas(res.data || []);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible cargar piezas PPF",
        text:
          error.response?.data?.message ||
          "Revise la conexion con el servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const res = await getPiezasPpf();

        if (active) {
          setPiezas(res.data || []);
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "No fue posible cargar piezas PPF",
          text:
            error.response?.data?.message ||
            "Revise la conexion con el servidor.",
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

  const piezasDisponibles =
    form.ubicacion === "INTERIOR"
      ? piezasInteriores
      : piezasExteriores;

  const actualizarForm = (field, value) => {
    const normalizers = {
      marca: mayusculas,
      modelo: soloNumeros,
      piezaPersonalizada: mayusculas,
    };
    const normalizar =
      normalizers[field] || ((input) => input);

    setForm((actual) => ({
      ...actual,
      [field]: normalizar(value),
      ...(field === "ubicacion"
        ? {
            pieza: "",
            piezaPersonalizada: "",
          }
        : {}),
      ...(field === "pieza" && value !== "OTRA"
        ? {
            piezaPersonalizada: "",
          }
        : {}),
    }));
  };

  const limpiar = () => {
    setForm(formInicial);
    setEditingId(null);
  };

  const limpiarPiezaManteniendoCarro = () => {
    setForm((actual) => ({
      ...formInicial,
      marca:
        actual.marca,
      modelo:
        actual.modelo,
      ubicacion:
        actual.ubicacion || "EXTERIOR",
    }));
    setEditingId(null);
  };

  const finalizarCarro = () => {
    setMantenerCarro(false);
    limpiar();
  };

  const guardar = async (event) => {
    event.preventDefault();

    const pieza = piezaFinal(form);

    if (
      !form.marca ||
      !form.modelo ||
      !form.ubicacion ||
      !pieza
    ) {
      return Swal.fire({
        icon: "warning",
        title: "Complete marca, modelo, ubicacion y pieza",
      });
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        pieza,
        anchoCm:
          Number(form.anchoCm || 0),
        largoCm:
          Number(form.largoCm || 0),
        cantidad:
          Number(form.cantidad || 1),
      };

      if (editingId) {
        await updatePiezaPpf(editingId, payload);
      } else {
        await createPiezaPpf(payload);
      }

      Swal.fire({
        icon: "success",
        title: editingId
          ? "Pieza actualizada"
          : "Pieza guardada",
        text:
          mantenerCarro && !editingId
            ? "Marca y modelo quedan listos para agregar otra pieza."
            : undefined,
        timer: 1500,
        showConfirmButton: false,
      });

      if (mantenerCarro && !editingId) {
        limpiarPiezaManteniendoCarro();
      } else {
        limpiar();
      }
      await cargar();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible guardar",
        text:
          error.response?.data?.message ||
          "Revise los datos de la pieza.",
      });
    } finally {
      setSaving(false);
    }
  };

  const editar = (pieza) => {
    const catalogo =
      pieza.ubicacion === "INTERIOR"
        ? piezasInteriores
        : piezasExteriores;
    const existeEnCatalogo =
      catalogo.includes(pieza.pieza);

    setEditingId(pieza._id);
    setForm({
      marca:
        pieza.marca || "",
      modelo:
        pieza.modelo || "",
      ubicacion:
        pieza.ubicacion || "EXTERIOR",
      pieza:
        existeEnCatalogo
          ? pieza.pieza
          : "OTRA",
      piezaPersonalizada:
        existeEnCatalogo
          ? ""
          : pieza.pieza || "",
      anchoCm:
        pieza.anchoCm || "",
      largoCm:
        pieza.largoCm || "",
      cantidad:
        pieza.cantidad || "1",
      observaciones:
        pieza.observaciones || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const eliminar = async (pieza) => {
    const result = await Swal.fire({
      icon: "question",
      title: "Eliminar pieza",
      text: `Desea eliminar ${pieza.pieza} de ${pieza.marca} ${pieza.modelo}?`,
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) {
      return;
    }

    await deletePiezaPpf(pieza._id);
    await cargar();
  };

  const marcasDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          piezas.map((pieza) => pieza.marca).filter(Boolean)
        )
      ).sort(),
    [piezas]
  );

  const modelosDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          piezas
            .filter(
              (pieza) =>
                filtroMarca === "TODAS" ||
                pieza.marca === filtroMarca
            )
            .map((pieza) => pieza.modelo)
            .filter(Boolean)
        )
      ).sort((a, b) => Number(b) - Number(a)),
    [filtroMarca, piezas]
  );

  const filtradas = useMemo(() => {
    const texto = search.trim().toLowerCase();

    return piezas.filter((pieza) => {
      const coincideMarca =
        filtroMarca === "TODAS" ||
        pieza.marca === filtroMarca;
      const coincideModelo =
        filtroModelo === "TODOS" ||
        pieza.modelo === filtroModelo;
      const coincideUbicacion =
        filtroUbicacion === "TODAS" ||
        pieza.ubicacion === filtroUbicacion;
      const contenido = [
        pieza.marca,
        pieza.modelo,
        pieza.ubicacion,
        pieza.pieza,
        pieza.observaciones,
      ]
        .join(" ")
        .toLowerCase();

      return (
        coincideMarca &&
        coincideModelo &&
        coincideUbicacion &&
        (!texto || contenido.includes(texto))
      );
    });
  }, [
    filtroMarca,
    filtroModelo,
    filtroUbicacion,
    piezas,
    search,
  ]);

  const marcasModelos = new Set(
    piezas.map((pieza) => `${pieza.marca}-${pieza.modelo}`)
  ).size;
  const exteriores =
    filtradas.filter((pieza) => pieza.ubicacion === "EXTERIOR").length;
  const interiores =
    filtradas.filter((pieza) => pieza.ubicacion === "INTERIOR").length;
  const pagination = usePagination(filtradas);

  const excelColumns = [
    {
      header: "Marca",
      value: (pieza) => pieza.marca,
    },
    {
      header: "Modelo",
      value: (pieza) => pieza.modelo,
    },
    {
      header: "Ubicacion",
      value: (pieza) => pieza.ubicacion,
    },
    {
      header: "Pieza",
      value: (pieza) => pieza.pieza,
      width: 24,
    },
    {
      header: "Ancho cm",
      value: (pieza) => Number(pieza.anchoCm || 0),
    },
    {
      header: "Largo cm",
      value: (pieza) => Number(pieza.largoCm || 0),
    },
    {
      header: "Cantidad",
      value: (pieza) => Number(pieza.cantidad || 1),
    },
    {
      header: "Observaciones",
      value: (pieza) => pieza.observaciones || "",
      width: 32,
    },
  ];

  if (loading) {
    return (
      <div className="p-8 text-slate-600">
        Cargando piezas PPF...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Vehiculos" value={marcasModelos} />
        <StatCard label="Piezas exteriores" value={exteriores} />
        <StatCard label="Piezas interiores" value={interiores} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {editingId
                  ? "Editar pieza"
                  : "Agregar pieza"}
              </h2>
              <p className="text-sm text-slate-500">
                Crea una guia de piezas y medidas por carro.
              </p>
            </div>
          </div>

          <form
            onSubmit={guardar}
            className="space-y-4"
          >
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-slate-900">
                    Varias piezas del mismo carro
                  </p>
                  <p className="text-sm text-slate-600">
                    Conserva marca y modelo despues de guardar cada pieza.
                  </p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-blue-100">
                  <input
                    type="checkbox"
                    checked={mantenerCarro}
                    onChange={(event) =>
                      setMantenerCarro(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  Mantener carro
                </label>
              </div>

              {mantenerCarro && (
                <button
                  type="button"
                  onClick={finalizarCarro}
                  className="mt-3 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                >
                  Finalizar carro
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Marca">
                <input
                  value={form.marca}
                  onChange={(event) =>
                    actualizarForm("marca", event.target.value)
                  }
                  placeholder="Ej: BMW"
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Modelo">
                <input
                  value={form.modelo}
                  onChange={(event) =>
                    actualizarForm("modelo", event.target.value)
                  }
                  placeholder="Ej: 2024"
                  inputMode="numeric"
                  className={inputClass}
                  required
                />
              </Field>
            </div>

            <Field label="Ubicacion">
              <div className="grid grid-cols-2 gap-2">
                {["EXTERIOR", "INTERIOR"].map((ubicacion) => (
                  <button
                    key={ubicacion}
                    type="button"
                    onClick={() =>
                      actualizarForm("ubicacion", ubicacion)
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      form.ubicacion === ubicacion
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {ubicacion === "EXTERIOR"
                      ? "Exterior"
                      : "Interior"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Pieza">
              <select
                value={form.pieza}
                onChange={(event) =>
                  actualizarForm("pieza", event.target.value)
                }
                className={inputClass}
                required
              >
                <option value="">
                  Seleccione pieza
                </option>
                {piezasDisponibles.map((pieza) => (
                  <option key={pieza} value={pieza}>
                    {pieza === "OTRA"
                      ? "Crear otra pieza"
                      : pieza}
                  </option>
                ))}
              </select>
            </Field>

            {form.pieza === "OTRA" && (
              <Field label="Nombre de la pieza">
                <input
                  value={form.piezaPersonalizada}
                  onChange={(event) =>
                    actualizarForm(
                      "piezaPersonalizada",
                      event.target.value
                    )
                  }
                  placeholder="Ej: BOQUILLA PUERTA"
                  className={inputClass}
                  required
                />
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Ancho cm">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.anchoCm}
                  onChange={(event) =>
                    actualizarForm("anchoCm", event.target.value)
                  }
                  placeholder="0"
                  className={inputClass}
                />
              </Field>

              <Field label="Largo cm">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.largoCm}
                  onChange={(event) =>
                    actualizarForm("largoCm", event.target.value)
                  }
                  placeholder="0"
                  className={inputClass}
                />
              </Field>

              <Field label="Cantidad">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.cantidad}
                  onChange={(event) =>
                    actualizarForm("cantidad", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Observaciones">
              <textarea
                value={form.observaciones}
                onChange={(event) =>
                  actualizarForm("observaciones", event.target.value)
                }
                placeholder="Notas de instalacion, plantilla o tolerancia."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Shield size={17} />
                {saving
                  ? "Guardando..."
                  : editingId
                  ? "Actualizar pieza"
                  : "Guardar pieza"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={limpiar}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Guia de piezas PPF
              </h2>
              <p className="text-sm text-slate-500">
                Consulta medidas por marca, modelo y ubicacion.
              </p>
            </div>

            <ExcelButton
              title="Piezas PPF"
              fileName="piezas-ppf"
              sheetName="Piezas PPF"
              columns={excelColumns}
              rows={filtradas}
            />
          </div>

          <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_160px_150px_150px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-3.5 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por marca, modelo, pieza u observacion..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 pl-10 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <select
              value={filtroMarca}
              onChange={(event) => {
                setFiltroMarca(event.target.value);
                setFiltroModelo("TODOS");
              }}
              className="rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="TODAS">
                Todas las marcas
              </option>
              {marcasDisponibles.map((marca) => (
                <option key={marca} value={marca}>
                  {marca}
                </option>
              ))}
            </select>

            <select
              value={filtroModelo}
              onChange={(event) =>
                setFiltroModelo(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="TODOS">
                Todos modelos
              </option>
              {modelosDisponibles.map((modelo) => (
                <option key={modelo} value={modelo}>
                  {modelo}
                </option>
              ))}
            </select>

            <select
              value={filtroUbicacion}
              onChange={(event) =>
                setFiltroUbicacion(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="TODAS">
                Todas
              </option>
              <option value="EXTERIOR">
                Exteriores
              </option>
              <option value="INTERIOR">
                Interiores
              </option>
            </select>
          </div>

          {filtradas.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No hay piezas PPF con esos filtros.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-slate-900 text-xs uppercase text-slate-200">
                  <tr>
                    <th className="p-4 text-left">Vehiculo</th>
                    <th className="p-4 text-left">Ubicacion</th>
                    <th className="p-4 text-left">Pieza</th>
                    <th className="p-4 text-left">Medidas</th>
                    <th className="p-4 text-left">Observaciones</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {pagination.pageItems.map((pieza) => (
                    <tr
                      key={pieza._id}
                      className="hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <p className="font-black text-slate-900">
                          {pieza.marca}
                        </p>
                        <p className="text-xs text-slate-500">
                          Modelo {pieza.modelo}
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            pieza.ubicacion === "EXTERIOR"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {pieza.ubicacion}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {pieza.pieza}
                        {Number(pieza.cantidad || 1) > 1 && (
                          <span className="ml-2 text-xs text-slate-400">
                            x{pieza.cantidad}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">
                        {Number(pieza.anchoCm || 0) > 0 ||
                        Number(pieza.largoCm || 0) > 0
                          ? `${Number(pieza.anchoCm || 0)} x ${Number(
                              pieza.largoCm || 0
                            )} cm`
                          : "Sin medida"}
                      </td>
                      <td className="max-w-[260px] p-4 text-slate-600">
                        {pieza.observaciones || "-"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => editar(pieza)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                            title="Editar"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(pieza)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <TablePagination pagination={pagination} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <Car size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Piezas PPF por vehiculo
          </h1>
          <p className="text-sm text-slate-500">
            Alimenta la base de datos de partes para repetir medidas en carros iguales.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="metric-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="metric-value mt-2 font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-1">
        {children}
      </div>
    </label>
  );
}

export default PiezasPpfPage;
