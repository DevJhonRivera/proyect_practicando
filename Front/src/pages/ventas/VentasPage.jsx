import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  BadgeDollarSign,
  Car,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  User,
} from "lucide-react";

import { getCortes } from "../../api/cortes.api";
import {
  createVenta,
  getVentas,
  updateVenta,
  updateEstadoVenta,
} from "../../api/ventas.api";
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
  LAVADO: "Lavado",
  POLICHADA: "Polichada",
  PDR: "PDR",
  ASEGURADA: "Asegurada",
  OTRO: "Otro",
};

const serviciosAdicionales = [
  "LAVADO",
  "POLICHADA",
  "PDR",
  "ASEGURADA",
  "OTRO",
];

const ventaInicial = {
  cliente: {
    nombre: "",
    telefono: "",
  },
  vehiculo: {
    placa: "",
    marca: "",
    modelo: "",
  },
  estado: "PENDIENTE",
  descuento: "",
  observaciones: "",
  items: [],
};

const itemManualInicial = {
  tipoServicio: "LAVADO",
  descripcion: "",
  cantidad: 1,
  valorUnitario: "",
};

const mayusculas = (value) =>
  String(value || "").toUpperCase();

const soloNumeros = (value) =>
  String(value || "").replace(/\D/g, "");

const normalizarPlaca = (value) =>
  mayusculas(value).replace(/\s+/g, "").trim();

function VentasPage() {
  const [ventas, setVentas] = useState([]);
  const [cortes, setCortes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroVerificacion, setFiltroVerificacion] =
    useState("PENDIENTES");
  const [form, setForm] = useState(ventaInicial);
  const [corteSeleccionado, setCorteSeleccionado] =
    useState("");
  const [valorCorte, setValorCorte] = useState("");
  const [itemManual, setItemManual] =
    useState(itemManualInicial);

  const cargar = async () => {
    try {
      setLoading(true);
      const [ventasRes, cortesRes] =
        await Promise.all([
          getVentas(),
          getCortes(),
        ]);

      setVentas(ventasRes.data || []);
      setCortes(cortesRes.data || []);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error cargando ventas",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const [ventasRes, cortesRes] =
          await Promise.all([
            getVentas(),
            getCortes(),
          ]);

        if (active) {
          setVentas(ventasRes.data || []);
          setCortes(cortesRes.data || []);
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "Error cargando ventas",
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

  const ventasFiltradas = useMemo(() => {
    const texto = search.toLowerCase();

    return ventas.filter((venta) => {
      const cliente =
        venta.cliente?.nombre || "";
      const placa =
        venta.vehiculo?.placa || "";
      const codigo =
        venta.codigoVenta || "";

      return (
        cliente.toLowerCase().includes(texto) ||
        placa.toLowerCase().includes(texto) ||
        codigo.toLowerCase().includes(texto)
      );
    });
  }, [ventas, search]);

  const subtotal = form.items.reduce(
    (acc, item) =>
      acc + Number(item.total || 0),
    0
  );

  const descuento = Number(form.descuento || 0);
  const total = Math.max(subtotal - descuento, 0);

  const gruposCortes = useMemo(
    () => agruparCortesPorCarroMaterial(cortes),
    [cortes]
  );

  const grupoActual = gruposCortes.find(
    (grupo) => grupo.key === corteSeleccionado
  );

  const gruposSinVenta = gruposCortes.filter(
    (grupo) => !grupoTieneVenta(grupo)
  );

  const placaVenta = normalizarPlaca(form.vehiculo.placa);

  const gruposSinVentaDelCarro = useMemo(() => {
    if (!placaVenta) {
      return gruposSinVenta;
    }

    return gruposSinVenta.filter(
      (grupo) => normalizarPlaca(grupo.placa) === placaVenta
    );
  }, [gruposSinVenta, placaVenta]);

  const gruposConVenta = gruposCortes.filter(
    grupoTieneVenta
  );

  const gruposVerificacion =
    filtroVerificacion === "TODOS"
      ? gruposCortes
      : filtroVerificacion === "VENDIDOS"
      ? gruposConVenta
      : gruposSinVenta;

  useEffect(() => {
    if (
      corteSeleccionado &&
      !gruposSinVentaDelCarro.some(
        (grupo) => grupo.key === corteSeleccionado
      )
    ) {
      setCorteSeleccionado("");
      setValorCorte("");
    }
  }, [corteSeleccionado, gruposSinVentaDelCarro]);

  const seleccionarCorte = (grupoKey) => {
    const grupo =
      gruposCortes.find((item) => item.key === grupoKey);

    setCorteSeleccionado(grupoKey);

    if (!grupo) {
      return;
    }

    setForm((actual) => ({
      ...actual,
      vehiculo: {
        placa:
          mayusculas(grupo.placa || actual.vehiculo.placa),
        marca:
          mayusculas(grupo.marca || actual.vehiculo.marca),
        modelo:
          soloNumeros(grupo.modelo || actual.vehiculo.modelo),
      },
    }));
  };

  const cargarCorteEnVenta = (grupo) => {
    seleccionarCorte(grupo.key);
    setValorCorte(
      grupo.valorVenta > 0
        ? String(grupo.valorVenta)
        : ""
    );
  };

  const actualizarCliente = (field, value) => {
    const nuevoValor =
      field === "nombre" ? mayusculas(value) : value;

    setForm({
      ...form,
      cliente: {
        ...form.cliente,
        [field]: nuevoValor,
      },
    });
  };

  const actualizarVehiculo = (field, value) => {
    const nuevoValor =
      field === "modelo"
        ? soloNumeros(value)
        : mayusculas(value);

    setForm({
      ...form,
      vehiculo: {
        ...form.vehiculo,
        [field]: nuevoValor,
      },
    });
  };

  const agregarCorte = () => {
    if (!grupoActual) {
      return Swal.fire({
        icon: "warning",
        title: "Seleccione un grupo de cortes",
      });
    }

    if (valorCorte === "" || Number(valorCorte) < 0) {
      return Swal.fire({
        icon: "warning",
        title: "Ingrese el valor de venta del corte",
      });
    }

    const descripcion =
      mayusculas(`${servicioLabels[grupoActual.tipoServicio]} ${grupoActual.cortes.length} corte${grupoActual.cortes.length === 1 ? "" : "s"}`);

    setForm({
      ...form,
      vehiculo: {
        placa: mayusculas(grupoActual.placa || form.vehiculo.placa),
        marca: mayusculas(grupoActual.marca || form.vehiculo.marca),
        modelo: soloNumeros(grupoActual.modelo || form.vehiculo.modelo),
      },
      items: [
        ...form.items,
        {
          tipoServicio: grupoActual.tipoServicio,
          descripcion,
          corteId: grupoActual.cortes[0]?._id,
          corteIds: grupoActual.cortes.map((corte) => corte._id),
          cantidad: 1,
          valorUnitario: Number(valorCorte),
          total: Number(valorCorte),
        },
      ],
    });

    setCorteSeleccionado("");
    setValorCorte("");
  };

  const agregarServicioManual = () => {
    if (!itemManual.descripcion.trim()) {
      return Swal.fire({
        icon: "warning",
        title: "Ingrese la descripcion del servicio",
      });
    }

    if (
      itemManual.valorUnitario === "" ||
      Number(itemManual.valorUnitario) < 0
    ) {
      return Swal.fire({
        icon: "warning",
        title: "Ingrese el valor del servicio",
      });
    }

    const cantidad =
      Math.max(Number(itemManual.cantidad || 1), 1);
    const valorUnitario =
      Number(itemManual.valorUnitario || 0);

    setForm({
      ...form,
      items: [
        ...form.items,
        {
          ...itemManual,
          descripcion: mayusculas(itemManual.descripcion),
          cantidad,
          valorUnitario,
          total:
            cantidad * valorUnitario,
        },
      ],
    });

    setItemManual(itemManualInicial);
  };

  const eliminarItem = (index) => {
    setForm({
      ...form,
      items: form.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    });
  };

  const guardarVenta = async () => {
    try {
      if (!form.cliente.nombre.trim()) {
        return Swal.fire({
          icon: "warning",
          title: "Ingrese el cliente",
        });
      }

      if (
        !form.vehiculo.placa.trim() ||
        !form.vehiculo.marca.trim() ||
        !form.vehiculo.modelo.trim()
      ) {
        return Swal.fire({
          icon: "warning",
          title: "Complete el vehiculo",
        });
      }

      if (form.items.length === 0) {
        return Swal.fire({
          icon: "warning",
          title: "Agregue al menos un servicio",
        });
      }

      await createVenta({
        ...form,
        descuento,
      });

      Swal.fire({
        icon: "success",
        title: "Venta registrada",
      });

      setForm(ventaInicial);
      await cargar();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message ||
          "No fue posible guardar la venta",
      });
    }
  };

  const marcarPagada = async (venta) => {
    await updateEstadoVenta(venta._id, "PAGADA");
    await cargar();
  };

  const editarVenta = async (venta) => {
    if (venta.estado === "PAGADA") {
      const confirmacion = await Swal.fire({
        icon: "warning",
        title: "Venta pagada",
        text: "Esta venta ya esta pagada. Editela solo si necesita corregir una auditoria.",
        showCancelButton: true,
        confirmButtonText: "Editar de todos modos",
        cancelButtonText: "Cancelar",
      });

      if (!confirmacion.isConfirmed) {
        return;
      }
    }

    const itemsHtml =
      (venta.items || [])
        .map(
          (item, index) => `
            <label class="block text-left text-sm text-slate-600">
              ${escapeHtml(item.descripcion || "SERVICIO")}
              <input
                class="swal2-input venta-item-valor"
                data-index="${index}"
                type="number"
                min="0"
                value="${Number(item.valorUnitario || item.total || 0)}"
              />
            </label>
          `
        )
        .join("");

    const result = await Swal.fire({
      title: "Editar venta",
      html: `
        <div class="grid gap-2">
          <input id="venta-cliente" class="swal2-input" placeholder="Cliente" value="${escapeHtml(venta.cliente?.nombre || "")}" />
          <input id="venta-telefono" class="swal2-input" placeholder="Telefono" value="${escapeHtml(venta.cliente?.telefono || "")}" />
          <input id="venta-placa" class="swal2-input" placeholder="Placa" value="${escapeHtml(venta.vehiculo?.placa || "")}" />
          <input id="venta-marca" class="swal2-input" placeholder="Marca" value="${escapeHtml(venta.vehiculo?.marca || "")}" />
          <input id="venta-modelo" class="swal2-input" placeholder="Modelo" inputmode="numeric" value="${escapeHtml(venta.vehiculo?.modelo || "")}" />
          <select id="venta-estado" class="swal2-input">
            ${["PENDIENTE", "PAGADA", "ANULADA"]
              .map(
                (estado) =>
                  `<option value="${estado}" ${venta.estado === estado ? "selected" : ""}>${estado}</option>`
              )
              .join("")}
          </select>
          ${itemsHtml}
          <input id="venta-descuento" class="swal2-input" type="number" min="0" placeholder="Descuento" value="${Number(venta.descuento || 0)}" />
          <input id="venta-observaciones" class="swal2-input" placeholder="Observaciones" value="${escapeHtml(venta.observaciones || "")}" />
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const popup = Swal.getPopup();
        const valueOf = (id) =>
          popup.querySelector(id)?.value || "";
        const itemInputs = Array.from(
          popup.querySelectorAll(".venta-item-valor")
        );

        const items = (venta.items || []).map((item, index) => {
          const cantidad =
            Math.max(Number(item.cantidad || 1), 1);
          const valorUnitario =
            Number(itemInputs[index]?.value || 0);

          return {
            tipoServicio: item.tipoServicio,
            descripcion: item.descripcion,
            corteId: getEntityId(item.corteId),
            corteIds: (item.corteIds || []).map(getEntityId),
            cantidad,
            valorUnitario,
          };
        });

        const payload = {
          cliente: {
            nombre: mayusculas(valueOf("#venta-cliente")),
            telefono: valueOf("#venta-telefono"),
          },
          vehiculo: {
            placa: mayusculas(valueOf("#venta-placa")),
            marca: mayusculas(valueOf("#venta-marca")),
            modelo: soloNumeros(valueOf("#venta-modelo")),
          },
          estado: valueOf("#venta-estado"),
          descuento: Number(valueOf("#venta-descuento") || 0),
          observaciones: mayusculas(valueOf("#venta-observaciones")),
          items,
        };

        if (
          !payload.cliente.nombre ||
          !payload.vehiculo.placa ||
          !payload.vehiculo.marca ||
          !payload.vehiculo.modelo
        ) {
          Swal.showValidationMessage(
            "Complete cliente, placa, marca y modelo"
          );
          return false;
        }

        if (
          items.some(
            (item) =>
              !item.descripcion ||
              Number(item.valorUnitario) < 0
          )
        ) {
          Swal.showValidationMessage(
            "Revise los valores de los servicios"
          );
          return false;
        }

        return payload;
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await updateVenta(venta._id, result.value);
      Swal.fire({
        icon: "success",
        title: "Venta actualizada",
      });
      await cargar();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible actualizar",
        text:
          error.response?.data?.message ||
          "Revise la informacion de la venta",
      });
    }
  };

  const excelColumns = [
    {
      header: "Codigo",
      value: (venta) => venta.codigoVenta,
    },
    {
      header: "Cliente",
      value: (venta) => venta.cliente?.nombre,
      width: 24,
    },
    {
      header: "Placa",
      value: (venta) => venta.vehiculo?.placa,
    },
    {
      header: "Vehiculo",
      value: (venta) =>
        `${venta.vehiculo?.marca || ""} ${venta.vehiculo?.modelo || ""}`.trim(),
      width: 24,
    },
    {
      header: "Servicios",
      value: (venta) => venta.items?.length || 0,
    },
    {
      header: "Total",
      value: (venta) => Number(venta.total || 0),
    },
    {
      header: "Estado",
      value: (venta) => venta.estado,
    },
  ];

  if (loading) {
    return (
      <div className="p-8 text-slate-600">
        Cargando ventas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Ventas
          </h1>
          <p className="text-slate-500">
            Registra cliente, vehiculo, cortes vendidos y servicios adicionales.
          </p>
        </div>

        <ExcelButton
          title="Ventas"
          fileName="ventas"
          sheetName="Ventas"
          columns={excelColumns}
          rows={ventasFiltradas}
        />
      </div>

      <VerificacionCortesAgrupada
        grupos={gruposVerificacion}
        totalGrupos={gruposCortes.length}
        gruposSinVenta={gruposSinVenta.length}
        gruposConVenta={gruposConVenta.length}
        filtro={filtroVerificacion}
        setFiltro={setFiltroVerificacion}
        onSelectCorte={cargarCorteEnVenta}
      />

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b flex items-center gap-3">
            <BadgeDollarSign className="text-blue-600" />
            <h2 className="text-lg font-bold">
              Nueva venta
            </h2>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Cliente">
                <Input
                  value={form.cliente.nombre}
                  onChange={(value) =>
                    actualizarCliente("nombre", value)
                  }
                />
              </Field>
              <Field label="Telefono">
                <Input
                  value={form.cliente.telefono}
                  onChange={(value) =>
                    actualizarCliente("telefono", value)
                  }
                />
              </Field>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Placa">
                <Input
                  value={form.vehiculo.placa}
                  onChange={(value) =>
                    actualizarVehiculo(
                      "placa",
                      value
                    )
                  }
                />
              </Field>
              <Field label="Marca">
                <Input
                  value={form.vehiculo.marca}
                  onChange={(value) =>
                    actualizarVehiculo("marca", value)
                  }
                />
              </Field>
              <Field label="Modelo">
                <Input
                  value={form.vehiculo.modelo}
                  onChange={(value) =>
                    actualizarVehiculo("modelo", value)
                  }
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </Field>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <div className="p-4 bg-slate-50 border-b flex items-center gap-2">
                <Car size={20} className="text-blue-600" />
                <h3 className="font-bold">
                  Cortes registrados del carro
                </h3>
              </div>

              <div className="p-4 grid lg:grid-cols-[minmax(0,1fr)_180px] gap-3">
                <select
                  value={corteSeleccionado}
                  onChange={(event) =>
                    seleccionarCorte(event.target.value)
                  }
                  className="border rounded-lg p-3 bg-white min-w-0 text-xs leading-tight"
                >
                  <option value="">
                    {placaVenta
                      ? `Cortes pendientes de ${placaVenta}`
                      : "Seleccione corte..."}
                  </option>
                  {gruposSinVentaDelCarro.map((grupo) => (
                    <option
                      key={grupo.key}
                      value={grupo.key}
                    >
                      {textoOpcionGrupoCorte(grupo)}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  value={valorCorte}
                  onChange={(event) =>
                    setValorCorte(event.target.value)
                  }
                  placeholder="Valor"
                  className="border rounded-lg p-3"
                />

                {grupoActual && (
                  <div className="lg:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                    <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
                      <div>
                        <p className="font-bold text-blue-900">
                          {grupoActual.material}
                        </p>
                        <p className="text-blue-700">
                          {grupoActual.placa} - {grupoActual.marca} {grupoActual.modelo}
                        </p>
                      </div>
                      <span className="font-semibold">
                        {partesGrupoCorte(grupoActual)}
                      </span>
                      <span className="font-bold">
                        {formatoMetros(grupoActual.metrosUtilizados)}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-blue-700 leading-relaxed">
                      {grupoActual.cortes
                        .map(
                          (corte) =>
                            `${labelTipoCorte(corte.tipoCorte)}: ${formatoMetros(corte.metrosUtilizados)}`
                        )
                        .join(" | ")}
                    </p>
                  </div>
                )}

                {placaVenta && gruposSinVentaDelCarro.length === 0 && (
                  <div className="lg:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    No hay cortes pendientes para la placa {placaVenta}.
                  </div>
                )}

                <div className="lg:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={agregarCorte}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Agregar
                </button>
                </div>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <div className="p-4 bg-slate-50 border-b flex items-center gap-2">
                <ClipboardList size={20} className="text-green-600" />
                <h3 className="font-bold">
                  Servicios adicionales
                </h3>
              </div>

              <div className="p-4 grid md:grid-cols-2 xl:grid-cols-[180px_minmax(0,1fr)_120px_160px] gap-3">
                <select
                  value={itemManual.tipoServicio}
                  onChange={(event) =>
                    setItemManual({
                      ...itemManual,
                      tipoServicio: event.target.value,
                    })
                  }
                  className="border rounded-lg p-3 bg-white"
                >
                  {serviciosAdicionales.map((servicio) => (
                    <option
                      key={servicio}
                      value={servicio}
                    >
                      {servicioLabels[servicio]}
                    </option>
                  ))}
                </select>

                <input
                  value={itemManual.descripcion}
                  onChange={(event) =>
                    setItemManual({
                      ...itemManual,
                      descripcion: mayusculas(event.target.value),
                    })
                  }
                  placeholder="Descripcion"
                  className="border rounded-lg p-3 min-w-0"
                />

                <input
                  type="number"
                  min="1"
                  value={itemManual.cantidad}
                  onChange={(event) =>
                    setItemManual({
                      ...itemManual,
                      cantidad: event.target.value,
                    })
                  }
                  className="border rounded-lg p-3"
                />

                <input
                  type="number"
                  min="0"
                  value={itemManual.valorUnitario}
                  onChange={(event) =>
                    setItemManual({
                      ...itemManual,
                      valorUnitario: event.target.value,
                    })
                  }
                  placeholder="Valor"
                  className="border rounded-lg p-3"
                />

                <div className="md:col-span-2 xl:col-span-4 flex justify-end">
                <button
                  type="button"
                  onClick={agregarServicioManual}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Agregar
                </button>
                </div>
              </div>
            </div>

            <ItemsVenta
              items={form.items}
              onDelete={eliminarItem}
            />

            <div className="grid md:grid-cols-[1fr_180px] gap-4">
              <Field label="Observaciones">
                <Input
                  value={form.observaciones}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      observaciones: mayusculas(value),
                    })
                  }
                />
              </Field>
              <Field label="Descuento">
                <Input
                  type="number"
                  value={form.descuento}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      descuento: value,
                    })
                  }
                />
              </Field>
            </div>

            <div className="border-t pt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">
                  Subtotal: <strong>{formatoCop.format(subtotal)}</strong>
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  Total: {formatoCop.format(total)}
                </p>
              </div>

              <button
                type="button"
                onClick={guardarVenta}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2"
              >
                <Save size={18} />
                Guardar venta
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-3.5 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar cliente, placa o venta..."
                className="w-full border rounded-xl p-3 pl-10"
              />
            </div>
          </div>

          <div className="divide-y max-h-[820px] overflow-y-auto">
            {ventasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No hay ventas registradas.
              </div>
            ) : (
              ventasFiltradas.map((venta) => (
                <VentaCard
                  key={venta._id}
                  venta={venta}
                  onMarkPaid={marcarPagada}
                  onEdit={editarVenta}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function VerificacionCortesAgrupada({
  grupos,
  totalGrupos,
  gruposSinVenta,
  gruposConVenta,
  filtro,
  setFiltro,
  onSelectCorte,
}) {
  const excelColumns = [
    {
      header: "Placa",
      value: (grupo) => grupo.placa,
    },
    {
      header: "Vehiculo",
      value: (grupo) =>
        `${grupo.marca || ""} ${grupo.modelo || ""}`.trim(),
      width: 24,
    },
    {
      header: "Servicio",
      value: (grupo) => servicioLabels[grupo.tipoServicio],
    },
    {
      header: "Cortes incluidos",
      value: (grupo) =>
        grupo.cortes
          .map((corte) => corte.tipoCorte || "Corte")
          .join(", "),
      width: 32,
    },
    {
      header: "Costo material total",
      value: (grupo) => grupo.costoMaterial,
    },
    {
      header: "Valor venta",
      value: (grupo) => grupo.valorVenta,
    },
    {
      header: "Utilidad",
      value: utilidadGrupo,
    },
    {
      header: "Estado",
      value: (grupo) =>
        grupoTieneVenta(grupo)
          ? "Con valor"
          : "Falta valor",
    },
  ];

  return (
    <section className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="p-5 border-b flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Verificacion de cortes
          </h2>
          <p className="text-sm text-slate-500">
            Una fila comercial por carro/material, con los cortes detallados debajo.
          </p>
        </div>

        <ExcelButton
          title="Verificacion de Cortes"
          fileName="verificacion-cortes-venta"
          sheetName="Cortes"
          columns={excelColumns}
          rows={grupos}
        />
      </div>

      <div className="p-5 grid md:grid-cols-3 gap-4">
        <ResumenVenta
          label="Total carros/material"
          value={totalGrupos}
          color="text-blue-700"
        />
        <ResumenVenta
          label="Con valor de venta"
          value={gruposConVenta}
          color="text-green-700"
        />
        <ResumenVenta
          label="Faltan por venta"
          value={gruposSinVenta}
          color="text-red-700"
        />
      </div>

      <div className="px-5 pb-4 flex flex-wrap gap-2">
        {[
          ["PENDIENTES", "Faltan por venta"],
          ["VENDIDOS", "Con valor"],
          ["TODOS", "Todos"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFiltro(value)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              filtro === value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border-t">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="p-3 text-left">Placa</th>
              <th className="p-3 text-left">Vehiculo</th>
              <th className="p-3 text-left">Servicio</th>
              <th className="p-3 text-left">Corte</th>
              <th className="p-3 text-right">Costo corte</th>
              <th className="p-3 text-right">Costo total</th>
              <th className="p-3 text-right">Valor venta</th>
              <th className="p-3 text-right">Utilidad</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Accion</th>
            </tr>
          </thead>
          <tbody>
            {grupos.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="p-8 text-center text-slate-500"
                >
                  No hay grupos de cortes en esta vista.
                </td>
              </tr>
            ) : (
              grupos.flatMap((grupo) =>
                grupo.cortes.map((corte, index) => (
                  <tr
                    key={`${grupo.key}-${corte._id}`}
                    className="border-t hover:bg-slate-50"
                  >
                    {index === 0 && (
                      <>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 font-semibold align-top bg-white"
                        >
                          {grupo.placa}
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 align-top bg-white"
                        >
                          {grupo.marca} {grupo.modelo}
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 align-top bg-white"
                        >
                          <p className="font-semibold">
                            {servicioLabels[grupo.tipoServicio]}
                          </p>
                          <p className="text-xs text-slate-500">
                            {descripcionMaterialCorte(corte)}
                          </p>
                        </td>
                      </>
                    )}

                    <td className="p-3">
                      {corte.tipoCorte || "-"}
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-700">
                      {formatoCop.format(costoMaterialCorte(corte))}
                    </td>

                    {index === 0 && (
                      <>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 text-right font-bold align-top bg-white"
                        >
                          {formatoCop.format(grupo.costoMaterial)}
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 text-right font-bold align-top bg-white"
                        >
                          {grupoTieneVenta(grupo)
                            ? formatoCop.format(grupo.valorVenta)
                            : "-"}
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className={`p-3 text-right font-bold align-top bg-white ${
                            utilidadGrupo(grupo) < 0
                              ? "text-red-700"
                              : "text-green-700"
                          }`}
                        >
                          {grupoTieneVenta(grupo)
                            ? formatoCop.format(utilidadGrupo(grupo))
                            : "-"}
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 text-center align-top bg-white"
                        >
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              grupoTieneVenta(grupo)
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {grupoTieneVenta(grupo)
                              ? "Con valor"
                              : "Falta valor"}
                          </span>
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 text-center align-top bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => onSelectCorte(grupo)}
                            className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-semibold"
                          >
                            Cargar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function VerificacionCortes({
  cortes,
  totalCortes,
  cortesSinVenta,
  cortesConVenta,
  filtro,
  setFiltro,
  onSelectCorte,
}) {
  const excelColumns = [
    {
      header: "Placa",
      value: (corte) => corte.placa,
    },
    {
      header: "Vehiculo",
      value: (corte) =>
        `${corte.marca || ""} ${corte.modelo || ""}`.trim(),
      width: 24,
    },
    {
      header: "Corte",
      value: (corte) => corte.tipoCorte || "",
    },
    {
      header: "Material",
      value: descripcionMaterialCorte,
      width: 24,
    },
    {
      header: "Costo material",
      value: (corte) => Number(corte.costoMaterialCop || 0),
    },
    {
      header: "Valor venta",
      value: (corte) => Number(corte.valorVenta || 0),
    },
    {
      header: "Utilidad",
      value: utilidadCorte,
    },
    {
      header: "Estado",
      value: (corte) =>
        corteTieneVenta(corte)
          ? "Con valor"
          : "Falta valor",
    },
  ];

  return (
    <section className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="p-5 border-b flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Verificacion de cortes
          </h2>
          <p className="text-sm text-slate-500">
            Revisa que cada carro tenga registrado su valor de venta.
          </p>
        </div>

        <ExcelButton
          title="Verificacion de Cortes"
          fileName="verificacion-cortes-venta"
          sheetName="Cortes"
          columns={excelColumns}
          rows={cortes}
        />
      </div>

      <div className="p-5 grid md:grid-cols-3 gap-4">
        <ResumenVenta
          label="Total cortes"
          value={totalCortes}
          color="text-blue-700"
        />
        <ResumenVenta
          label="Con valor de venta"
          value={cortesConVenta}
          color="text-green-700"
        />
        <ResumenVenta
          label="Faltan por venta"
          value={cortesSinVenta}
          color="text-red-700"
        />
      </div>

      <div className="px-5 pb-4 flex flex-wrap gap-2">
        {[
          ["PENDIENTES", "Faltan por venta"],
          ["VENDIDOS", "Con valor"],
          ["TODOS", "Todos"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFiltro(value)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              filtro === value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border-t">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="p-3 text-left">Placa</th>
              <th className="p-3 text-left">Vehiculo</th>
              <th className="p-3 text-left">Corte</th>
              <th className="p-3 text-left">Material</th>
              <th className="p-3 text-right">Costo material</th>
              <th className="p-3 text-right">Valor venta</th>
              <th className="p-3 text-right">Utilidad</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Accion</th>
            </tr>
          </thead>
          <tbody>
            {cortes.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="p-8 text-center text-slate-500"
                >
                  No hay cortes en esta vista.
                </td>
              </tr>
            ) : (
              cortes.map((corte) => (
                <tr
                  key={corte._id}
                  className="border-t hover:bg-slate-50"
                >
                  <td className="p-3 font-semibold">
                    {corte.placa}
                  </td>
                  <td className="p-3">
                    {corte.marca} {corte.modelo}
                  </td>
                  <td className="p-3">
                    {corte.tipoCorte || "-"}
                  </td>
                  <td className="p-3">
                    {descripcionMaterialCorte(corte)}
                  </td>
                  <td className="p-3 text-right font-semibold text-slate-700">
                    {formatoCop.format(
                      costoMaterialCorte(corte)
                    )}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {corteTieneVenta(corte)
                      ? formatoCop.format(corte.valorVenta)
                      : "-"}
                  </td>
                  <td
                    className={`p-3 text-right font-semibold ${
                      utilidadCorte(corte) < 0
                        ? "text-red-700"
                        : "text-green-700"
                    }`}
                  >
                    {corteTieneVenta(corte)
                      ? formatoCop.format(utilidadCorte(corte))
                      : "-"}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        corteTieneVenta(corte)
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {corteTieneVenta(corte)
                        ? "Con valor"
                        : "Falta valor"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectCorte(corte)}
                      className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-semibold"
                    >
                      Cargar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ResumenVenta({ label, value, color }) {
  return (
    <div className="border rounded-xl p-4">
      <p className="text-sm text-slate-500">
        {label}
      </p>
      <p className={`text-3xl font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
}

function ItemsVenta({ items, onDelete }) {
  if (items.length === 0) {
    return (
      <div className="border rounded-xl p-6 text-center text-slate-500">
        Agregue cortes o servicios adicionales.
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="p-3 text-left">Servicio</th>
            <th className="p-3 text-left">Descripcion</th>
            <th className="p-3 text-center">Cant.</th>
            <th className="p-3 text-right">Valor</th>
            <th className="p-3 text-right">Total</th>
            <th className="p-3 text-center">Accion</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.descripcion}-${index}`} className="border-t">
              <td className="p-3 font-semibold">
                {servicioLabels[item.tipoServicio] || item.tipoServicio}
              </td>
              <td className="p-3">
                {item.descripcion}
              </td>
              <td className="p-3 text-center">
                {item.cantidad}
              </td>
              <td className="p-3 text-right">
                {formatoCop.format(item.valorUnitario || 0)}
              </td>
              <td className="p-3 text-right font-bold">
                {formatoCop.format(item.total || 0)}
              </td>
              <td className="p-3 text-center">
                <button
                  type="button"
                  onClick={() => onDelete(index)}
                  className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VentaCard({ venta, onMarkPaid, onEdit }) {
  return (
    <article className="p-5 space-y-3">
      <div className="flex justify-between gap-3">
        <div>
          <p className="font-bold text-slate-800">
            {venta.codigoVenta}
          </p>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <User size={14} />
            {venta.cliente?.nombre}
          </p>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <Car size={14} />
            {venta.vehiculo?.placa} - {venta.vehiculo?.marca} {venta.vehiculo?.modelo}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <EstadoBadge estado={venta.estado} />
          <button
            type="button"
            onClick={() => onEdit(venta)}
            title="Editar venta"
            aria-label="Editar venta"
            className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50"
          >
            <Pencil size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {venta.items?.map((item, index) => (
          <div
            key={`${venta._id}-${index}`}
            className="flex justify-between gap-3 text-sm"
          >
            <span className="text-slate-600">
              {servicioLabels[item.tipoServicio] || item.tipoServicio}: {item.descripcion}
              <ItemCortesRelacionados item={item} />
            </span>
            <strong>
              {formatoCop.format(item.total || 0)}
            </strong>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center border-t pt-3">
        <p className="text-xl font-bold text-blue-700">
          {formatoCop.format(venta.total || 0)}
        </p>
        {venta.estado !== "PAGADA" && (
          <button
            type="button"
            onClick={() => onMarkPaid(venta)}
            className="px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-2 text-sm"
          >
            <CheckCircle2 size={16} />
            Marcar pagada
          </button>
        )}
      </div>
    </article>
  );
}

function ItemCortesRelacionados({ item }) {
  const cortes = item.corteIds?.length
    ? item.corteIds
    : item.corteId
    ? [item.corteId]
    : [];

  if (!cortes.length) {
    return null;
  }

  return (
    <span className="block text-xs text-slate-400 mt-0.5">
      Cortes: {cortes
        .map((corte) =>
          corte?.tipoCorte || corte?._id || corte
        )
        .join(", ")}
    </span>
  );
}

function EstadoBadge({ estado }) {
  const styles = {
    PAGADA: "bg-green-100 text-green-700",
    ANULADA: "bg-red-100 text-red-700",
    PENDIENTE: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold h-fit ${
        styles[estado] || styles.PENDIENTE
      }`}
    >
      {estado}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-500">
        {label}
      </span>
      <div className="mt-1">
        {children}
      </div>
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  ...props
}) {
  return (
    <input
      type={type}
      value={value}
      {...props}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="w-full border rounded-lg p-3"
    />
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getEntityId(value) {
  return value?._id || value || undefined;
}

function formatoMetros(value) {
  return `${Number(value || 0).toFixed(2)} m`;
}

function labelTipoCorte(tipoCorte) {
  const labels = {
    PANORAMICO: "Panoramico",
    LUNETA: "Luneta",
    DELANTERAS: "Delanteras",
    TRASERAS: "Traseras",
    FIJOS: "Fijos",
    SUNROOF: "Sunroof",
    COMPLETO: "Completo",
    OTROS: "Otros",
  };

  return labels[tipoCorte] || tipoCorte || "Corte";
}

function partesGrupoCorte(grupo) {
  return grupo.cortes
    .map((corte) => labelTipoCorte(corte.tipoCorte))
    .filter(Boolean)
    .join(", ");
}

function textoOpcionGrupoCorte(grupo) {
  return `${grupo.placa} | ${grupo.marca} ${grupo.modelo} | ${grupo.material} | ${partesGrupoCorte(grupo)} | ${formatoMetros(grupo.metrosUtilizados)}`;
}

function materialCorte(corte) {
  return corte.rolloId || corte.retazoId || {};
}

function descripcionMaterialCorte(corte) {
  const material = materialCorte(corte);
  const clasificacion =
    etiquetaDetalle(material);

  return `${material.tipoPolarizado || "Material"} ${
    clasificacion || ""
  }`.trim();
}

function tipoServicioDesdeCorte(corte) {
  const material =
    descripcionMaterialCorte(corte).toUpperCase();

  if (material.includes("PPF")) {
    return "PPF";
  }

  if (material.includes("SEGURIDAD")) {
    return "PELICULA_SEGURIDAD";
  }

  return "POLARIZADO";
}

function corteTieneVenta(corte) {
  return Number(corte?.valorVenta || 0) > 0;
}

function costoMaterialCorte(corte) {
  return Number(corte?.costoMaterialCop || 0);
}

function utilidadCorte(corte) {
  return (
    Number(corte?.valorVenta || 0) -
    costoMaterialCorte(corte)
  );
}

function agruparCortesPorCarroMaterial(cortes) {
  const grupos = new Map();

  cortes.forEach((corte) => {
    const tipoServicio =
      tipoServicioDesdeCorte(corte);
    const material =
      descripcionMaterialCorte(corte);
    const key = [
      corte.placa || "",
      corte.marca || "",
      corte.modelo || "",
      tipoServicio,
      material,
    ]
      .join("|")
      .toUpperCase();

    const actual =
      grupos.get(key) || {
        key,
        placa: corte.placa || "",
        marca: corte.marca || "",
        modelo: corte.modelo || "",
        tipoServicio,
        material,
        cortes: [],
        costoMaterial: 0,
        valorVenta: 0,
        metrosUtilizados: 0,
      };

    actual.cortes.push(corte);
    actual.costoMaterial +=
      costoMaterialCorte(corte);
    actual.valorVenta +=
      Number(corte.valorVenta || 0);
    actual.metrosUtilizados +=
      Number(corte.metrosUtilizados || 0);

    grupos.set(key, actual);
  });

  return Array.from(grupos.values()).map((grupo) => ({
    ...grupo,
    costoMaterial:
      Math.round(grupo.costoMaterial),
    valorVenta:
      Math.round(grupo.valorVenta),
    metrosUtilizados:
      Math.round((grupo.metrosUtilizados + Number.EPSILON) * 100) / 100,
  }));
}

function grupoTieneVenta(grupo) {
  return Number(grupo?.valorVenta || 0) > 0;
}

function utilidadGrupo(grupo) {
  return (
    Number(grupo?.valorVenta || 0) -
    Number(grupo?.costoMaterial || 0)
  );
}

export default VentasPage;
