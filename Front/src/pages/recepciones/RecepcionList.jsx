import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  ClipboardList,
  Eye,
  Package,
  Plus,
  Save,
  Tags,
  Truck,
  X,
} from "lucide-react";

import {
  clasificarRolloRecepcion,
  createRecepcion,
  getRecepciones,
} from "../../api/recepciones.api";
import { getPedidos } from "../../api/pedidos.api";
import ExcelButton from "../../components/ui/ExcelButton";
import {
  anchoLabel,
  anchoValue,
  anchosPulgadas,
  normalizarAncho,
} from "../../utils/anchos";
import {
  etiquetaDetalle,
  etiquetaUnidad,
  unidadDetalle,
} from "../../utils/materiales";

function RecepcionList() {
  const [data, setData] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [openModal, setOpenModal] =
    useState(false);

  const [viewRecepcion, setViewRecepcion] =
    useState(null);

  const [clasificarRecepcion, setClasificarRecepcion] =
    useState(null);

  const [pedidos, setPedidos] =
    useState([]);

  const [form, setForm] =
    useState({
      cantidadRollos: "",
      observaciones: "",
    });

  const [rolloForm, setRolloForm] =
    useState({
      codigoPedido: "",
      detalleKey: "",
      codigoRollo: "",
      tipoPolarizado: "",
      porcentaje: "",
      unidadMedida: "PORCENTAJE",
      ancho: "",
      largoOriginal: "",
    });

  const cargar =
    async () => {
      try {
        const [recepcionesRes, pedidosRes] =
          await Promise.all([
            getRecepciones(),
            getPedidos(),
          ]);

        setData(
          recepcionesRes.data || []
        );

        setPedidos(
          pedidosRes.data || []
        );
      } catch (error) {
        console.error(error);

        Swal.fire({
          icon: "error",
          title:
            "Error cargando recepciones",
        });
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const [recepcionesRes, pedidosRes] =
          await Promise.all([
            getRecepciones(),
            getPedidos(),
          ]);

        if (active) {
          setData(
            recepcionesRes.data || []
          );

          setPedidos(
            pedidosRes.data || []
          );
        }
      } catch (error) {
        console.error(error);

        Swal.fire({
          icon: "error",
          title:
            "Error cargando recepciones",
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

  const guardarRecepcion =
    async () => {
      try {
        if (
          !form.cantidadRollos ||
          Number(form.cantidadRollos) <= 0
        ) {
          return Swal.fire({
            icon: "warning",
            title:
              "Ingrese cantidad de rollos",
          });
        }

        await createRecepcion({
          cantidadRollos:
            Number(
              form.cantidadRollos
            ),
          observaciones:
            form.observaciones,
        });

        Swal.fire({
          icon: "success",
          title:
            "Entrada creada",
        });

        setOpenModal(false);

        setForm({
          cantidadRollos: "",
          observaciones: "",
        });

        cargar();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title:
            error.response?.data
              ?.message ||
            "Error al crear entrada",
        });
      }
    };

  const abrirClasificar = (recepcion) => {
    if (
      recepcion.estado ===
      "COMPLETADA"
    ) {
      Swal.fire({
        icon: "info",
        title:
          "Entrada completa",
        text:
          "Todos los rollos de esta entrada ya fueron clasificados.",
      });

      return;
    }

    setClasificarRecepcion(recepcion);

    const primerPedido =
      pedidosPendientes[0];

    const primerDetalle =
      primerPedido
        ? detallesPendientes(primerPedido)[0]
        : null;

    setRolloForm({
      codigoPedido:
        primerPedido?.codigoPedido || "",
      detalleKey:
        primerDetalle
          ? detalleKey(primerDetalle)
          : "",
      codigoRollo: "",
      tipoPolarizado:
        primerDetalle?.tipoPolarizado || "",
      porcentaje:
        primerDetalle?.porcentaje || "",
      unidadMedida:
        unidadDetalle(primerDetalle),
      ancho:
        primerDetalle?.ancho
          ? anchoValue(primerDetalle.ancho)
          : anchoValue(anchosPulgadas[0].value),
      largoOriginal: "",
    });
  };

  const seleccionarPedido = (codigoPedido) => {
    const pedido =
      pedidosPendientes.find(
        (item) =>
          item.codigoPedido ===
          codigoPedido
      );

    const primerDetalle =
      pedido
        ? detallesPendientes(pedido)[0]
        : null;

    setRolloForm({
      ...rolloForm,
      codigoPedido,
      detalleKey:
        primerDetalle
          ? detalleKey(primerDetalle)
          : "",
      tipoPolarizado:
        primerDetalle?.tipoPolarizado || "",
      porcentaje:
        primerDetalle?.porcentaje || "",
      unidadMedida:
        unidadDetalle(primerDetalle),
      ancho:
        primerDetalle?.ancho
          ? anchoValue(primerDetalle.ancho)
          : anchoValue(anchosPulgadas[0].value),
    });
  };

  const seleccionarDetalle = (key) => {
    const pedido =
      pedidosPendientes.find(
        (item) =>
          item.codigoPedido ===
          rolloForm.codigoPedido
      );

    const detalle =
      detallesPendientes(pedido).find(
        (item) =>
          detalleKey(item) === key
      );

    setRolloForm({
      ...rolloForm,
      detalleKey: key,
      tipoPolarizado:
        detalle?.tipoPolarizado || "",
      porcentaje:
        detalle?.porcentaje || "",
      unidadMedida:
        unidadDetalle(detalle),
      ancho:
        detalle?.ancho
          ? anchoValue(detalle.ancho)
          : anchoValue(anchosPulgadas[0].value),
    });
  };

  const seleccionarAncho = (value) => {
    const pedido =
      pedidosPendientes.find(
        (item) =>
          item.codigoPedido ===
          rolloForm.codigoPedido
      );

    const detalles =
      detallesPendientes(pedido);

    const detalle =
      detalles.find(
        (item) =>
          normalizarAncho(item.ancho) ===
            normalizarAncho(value) &&
          item.tipoPolarizado ===
            rolloForm.tipoPolarizado &&
          String(item.porcentaje) ===
            String(rolloForm.porcentaje) &&
          unidadDetalle(item) ===
            unidadDetalle(rolloForm)
      ) ||
      detalles.find(
        (item) =>
          normalizarAncho(item.ancho) ===
          normalizarAncho(value)
      );

    setRolloForm({
      ...rolloForm,
      ancho: value,
      detalleKey:
        detalle
          ? detalleKey(detalle)
          : rolloForm.detalleKey,
      tipoPolarizado:
        detalle?.tipoPolarizado ||
        rolloForm.tipoPolarizado,
      porcentaje:
        detalle?.porcentaje ||
        rolloForm.porcentaje,
      unidadMedida:
        unidadDetalle(detalle || rolloForm),
    });
  };

  const guardarClasificacion =
    async () => {
      try {
        const requerido = [
          "codigoPedido",
          "detalleKey",
          "codigoRollo",
          "tipoPolarizado",
          "porcentaje",
          "ancho",
          "largoOriginal",
        ];

        const incompleto =
          requerido.some(
            (field) =>
              rolloForm[field] === "" ||
              rolloForm[field] === undefined ||
              rolloForm[field] === null
          );

        if (incompleto) {
          return Swal.fire({
            icon: "warning",
            title:
              "Complete los datos del rollo",
          });
        }

        await clasificarRolloRecepcion(
          clasificarRecepcion._id,
          {
            ...rolloForm,
            porcentaje:
              Number(
                rolloForm.porcentaje
              ),
            unidadMedida:
              unidadDetalle(rolloForm),
            ancho:
              Number(rolloForm.ancho),
            largoOriginal:
              Number(
                rolloForm.largoOriginal
              ),
          }
        );

        Swal.fire({
          icon: "success",
          title:
            "Rollo clasificado",
          text:
            "El rollo quedo en reserva.",
        });

        setClasificarRecepcion(null);
        cargar();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text:
            error.response?.data
              ?.message ||
            "No fue posible clasificar el rollo",
        });
      }
    };

  const totalRecepciones =
    data.length;

  const totalRollos =
    data.reduce(
      (acc, item) =>
        acc +
        (item.cantidadRollos || 0),
      0
    );

  const totalClasificados =
    data.reduce(
      (acc, item) =>
        acc +
        (item.clasificados || 0),
      0
    );

  const pendientes =
    data.filter(
      item =>
        item.estado !==
        "COMPLETADA"
    ).length;

  const pedidosPendientes =
    pedidos.filter(
      (pedido) =>
        pedido.estado !== "COMPLETADO" &&
        detallesPendientes(pedido).length > 0
    );

  const pedidoSeleccionado =
    pedidosPendientes.find(
      (pedido) =>
        pedido.codigoPedido ===
        rolloForm.codigoPedido
    );

  const materialesPendientes =
    detallesPendientes(
      pedidoSeleccionado
    );

  const anchoOpcionesPedido =
    materialesPendientes.some(
      (detalle) => detalle.ancho
    )
      ? Array.from(
          new Map(
            materialesPendientes.map((detalle) => [
              anchoValue(detalle.ancho),
              {
                value: anchoValue(detalle.ancho),
                label: anchoLabel(detalle.ancho),
              },
            ])
          ).values()
        )
      : anchosPulgadas.map((item) => ({
          value: anchoValue(item.value),
          label: item.label,
        }));

  const recepcionesExcelColumns = [
    {
      header: "Codigo",
      value: (item) => item.codigoRecepcion,
    },
    {
      header: "Fecha",
      value: (item) =>
        item.createdAt
          ? new Date(item.createdAt)
          : "",
      numFmt: "dd/mm/yyyy",
    },
    {
      header: "Rollos",
      value: (item) => item.cantidadRollos || 0,
    },
    {
      header: "Clasificados",
      value: (item) => item.clasificados || 0,
    },
    {
      header: "Avance %",
      value: porcentaje,
    },
    {
      header: "Estado",
      value: (item) => item.estado,
      width: 24,
    },
    {
      header: "Observaciones",
      value: (item) => item.observaciones || "",
      width: 32,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Entrada de mercancia
          </h1>

          <p className="text-slate-500">
            Clasifica los rollos que llegaron y envialos a bodega.
          </p>
        </div>

        <button
          onClick={() =>
            setOpenModal(true)
          }
          className="
          bg-green-600
          hover:bg-green-700
          text-white
          px-5
          py-3
          rounded-xl
          flex
          items-center
          gap-2"
        >
          <Plus size={18} />
          Nueva entrada
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-5">
        <Stat
          icon={<ClipboardList />}
          label="Entradas"
          value={totalRecepciones}
          color="text-blue-600"
        />

        <Stat
          icon={<Package />}
          label="Rollos recibidos"
          value={totalRollos}
          color="text-green-600"
        />

        <Stat
          icon={<Tags />}
          label="Clasificados"
          value={totalClasificados}
          color="text-purple-600"
        />

        <Stat
          icon={<Truck />}
          label="Pendientes"
          value={pendientes}
          color="text-yellow-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between gap-4">
          <h2 className="font-bold text-lg">
            Historial de entradas
          </h2>

          <ExcelButton
            title="Historial de Entradas"
            fileName="recepciones"
            sheetName="Entradas"
            columns={recepcionesExcelColumns}
            rows={data}
          />
        </div>

        {loading ? (
          <div className="p-10 text-center">
            Cargando...
          </div>
        ) : data.length === 0 ? (
          <div className="p-10 text-center">
            <Package
              size={60}
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 text-slate-500">
              No existen recepciones registradas
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-4 text-left">
                    Codigo
                  </th>
                  <th className="p-4 text-left">
                    Fecha
                  </th>
                  <th className="p-4 text-left">
                    Rollos
                  </th>
                  <th className="p-4 text-left">
                    Clasificados
                  </th>
                  <th className="p-4 text-left">
                    Estado
                  </th>
                  <th className="p-4 text-center">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b hover:bg-slate-50"
                  >
                    <td className="p-4 font-medium">
                      {item.codigoRecepcion}
                    </td>

                    <td className="p-4">
                      {new Date(
                        item.createdAt
                      ).toLocaleDateString()}
                    </td>

                    <td className="p-4">
                      {item.cantidadRollos || 0}
                    </td>

                    <td className="p-4">
                      <div className="min-w-[140px]">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>
                            {item.clasificados || 0}/
                            {item.cantidadRollos || 0}
                          </span>
                          <span>
                            {porcentaje(item)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full">
                          <div
                            className="h-2 bg-green-600 rounded-full"
                            style={{
                              width:
                                `${porcentaje(item)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <EstadoBadge
                        estado={item.estado}
                      />
                    </td>

                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setViewRecepcion(item)
                          }
                          className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                          title="Ver"
                        >
                          <Eye size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            abrirClasificar(item)
                          }
                          disabled={
                            item.estado ===
                            "COMPLETADA"
                          }
                          className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Clasificar rollo"
                        >
                          <Tags size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openModal && (
        <Modal
          title="Nueva entrada"
          onClose={() =>
            setOpenModal(false)
          }
        >
          <div className="space-y-4">
            <Field label="Cantidad de Rollos">
              <input
                type="number"
                min="1"
                value={form.cantidadRollos}
                onChange={(e)=>
                  setForm({
                    ...form,
                    cantidadRollos:
                      e.target.value,
                  })
                }
                className="w-full border rounded-lg p-3"
              />
            </Field>

            <Field label="Observaciones">
              <textarea
                rows="4"
                value={form.observaciones}
                onChange={(e)=>
                  setForm({
                    ...form,
                    observaciones:
                      e.target.value,
                  })
                }
                className="w-full border rounded-lg p-3"
              />
            </Field>

            <Actions
              onCancel={() =>
                setOpenModal(false)
              }
              onSave={guardarRecepcion}
              saveText="Guardar"
            />
          </div>
        </Modal>
      )}

      {viewRecepcion && (
        <Modal
          title={viewRecepcion.codigoRecepcion}
          onClose={() =>
            setViewRecepcion(null)
          }
        >
          <RecepcionDetalle
            recepcion={viewRecepcion}
          />
        </Modal>
      )}

      {clasificarRecepcion && (
        <Modal
          title={`Clasificar ${clasificarRecepcion.codigoRecepcion}`}
          onClose={() =>
            setClasificarRecepcion(null)
          }
        >
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Pedido">
                <select
                  value={rolloForm.codigoPedido}
                  onChange={(e) =>
                    seleccionarPedido(
                      e.target.value
                    )
                  }
                  className="w-full border rounded-lg p-3"
                >
                  {pedidosPendientes.length === 0 ? (
                    <option value="">
                      No hay pedidos pendientes
                    </option>
                  ) : (
                    pedidosPendientes.map((pedido) => (
                      <option
                        key={pedido._id}
                        value={pedido.codigoPedido}
                      >
                        {pedido.codigoPedido} - {pedido.proveedor}
                      </option>
                    ))
                  )}
                </select>
              </Field>

              <Field label="Codigo rollo">
                <input
                  value={rolloForm.codigoRollo}
                  onChange={(e) =>
                    setRolloForm({
                      ...rolloForm,
                      codigoRollo:
                        e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-3"
                />
              </Field>

              <Field label="Material pendiente">
                <select
                  value={rolloForm.detalleKey}
                  onChange={(e) =>
                    seleccionarDetalle(
                      e.target.value
                    )
                  }
                  className="w-full border rounded-lg p-3"
                >
                  {materialesPendientes.length === 0 ? (
                    <option value="">
                      Sin materiales pendientes
                    </option>
                  ) : (
                    materialesPendientes.map((detalle) => (
                      <option
                        key={detalleKey(detalle)}
                        value={detalleKey(detalle)}
                      >
                        {detalle.tipoPolarizado} {etiquetaDetalle(detalle)} {anchoLabel(detalle.ancho)} - {detalle.cantidadRecibida || 0}/{detalle.cantidadRollos}
                      </option>
                    ))
                  )}
                </select>
              </Field>

              <Field label={etiquetaUnidad(unidadDetalle(rolloForm))}>
                <input
                  type="number"
                  min="0"
                  value={rolloForm.porcentaje}
                  readOnly
                  className="w-full border rounded-lg p-3"
                />
              </Field>

              <Field label="Ancho">
                <select
                  value={rolloForm.ancho}
                  onChange={(e) =>
                    seleccionarAncho(
                      e.target.value
                    )
                  }
                  className="w-full border rounded-lg p-3"
                >
                  {anchoOpcionesPedido.length === 0 ? (
                    <option value="">
                      Sin medidas
                    </option>
                  ) : (
                    anchoOpcionesPedido.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))
                  )}
                </select>
              </Field>

              <Field label="Largo">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rolloForm.largoOriginal}
                  onChange={(e) =>
                    setRolloForm({
                      ...rolloForm,
                      largoOriginal:
                        e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-3"
                />
              </Field>
            </div>

            <Actions
              onCancel={() =>
                setClasificarRecepcion(null)
              }
              onSave={guardarClasificacion}
              saveText="Clasificar rollo"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

function porcentaje(item) {
  if (!item.cantidadRollos) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      ((item.clasificados || 0) /
        item.cantidadRollos) *
        100
    )
  );
}

function detallesPendientes(pedido) {
  return (
    pedido?.detalles?.filter(
      (detalle) =>
        Number(
          detalle.cantidadRecibida || 0
        ) <
        Number(
          detalle.cantidadRollos || 0
        )
    ) || []
  );
}

function detalleKey(detalle) {
  return `${detalle.tipoPolarizado}-${detalle.porcentaje}-${unidadDetalle(detalle)}-${normalizarAncho(detalle.ancho)}`;
}

function Stat({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex items-center gap-3">
        <div className={color}>
          {icon}
        </div>
        <div>
          <p className="text-slate-500">
            {label}
          </p>
          <h2 className="text-3xl font-bold">
            {value}
          </h2>
        </div>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const styles = {
    COMPLETADA:
      "bg-green-100 text-green-700",
    PARCIAL:
      "bg-blue-100 text-blue-700",
    PENDIENTE_CLASIFICACION:
      "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`
        px-3
        py-1
        rounded-full
        text-sm
        font-medium
        ${styles[estado] || styles.PENDIENTE_CLASIFICACION}
      `}
    >
      {estado}
    </span>
  );
}

function RecepcionDetalle({ recepcion }) {
  const rollosColumns = [
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
      header: "Metros",
      value: (rollo) => Number(rollo.largoDisponible || 0),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-4">
        <Info
          label="Rollos recibidos"
          value={recepcion.cantidadRollos}
        />
        <Info
          label="Clasificados"
          value={recepcion.clasificados || 0}
        />
        <Info
          label="Estado"
          value={recepcion.estado}
        />
      </div>

      <Info
        label="Observaciones"
        value={recepcion.observaciones || "-"}
      />

      <div className="border rounded-xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-4">
          <span className="font-semibold">
            Rollos clasificados
          </span>

          <ExcelButton
            title={`Rollos ${recepcion.codigoRecepcion}`}
            fileName={`rollos-${recepcion.codigoRecepcion}`}
            sheetName="Rollos"
            columns={rollosColumns}
            rows={recepcion.rollos || []}
          />
        </div>

        {!recepcion.rollos?.length ? (
          <div className="p-6 text-center text-slate-500">
            Todavia no hay rollos clasificados.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">
                  Codigo
                </th>
                <th className="p-3 text-left">
                  Material
                </th>
                <th className="p-3 text-left">
                  Clasificacion
                </th>
                <th className="p-3 text-left">
                  Ancho
                </th>
                <th className="p-3 text-left">
                  Metros
                </th>
              </tr>
            </thead>
            <tbody>
              {recepcion.rollos.map((rollo) => (
                <tr
                  key={rollo._id}
                  className="border-t"
                >
                  <td className="p-3">
                    {rollo.codigoRollo}
                  </td>
                  <td className="p-3">
                    {rollo.tipoPolarizado}
                  </td>
                  <td className="p-3">
                    {etiquetaDetalle(rollo)}
                  </td>
                  <td className="p-3">
                    {anchoLabel(rollo.ancho)}
                  </td>
                  <td className="p-3">
                    {Number(rollo.largoDisponible || 0).toFixed(2)} m
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-sm text-slate-500">
        {label}
      </p>
      <p className="font-semibold text-slate-800 mt-1">
        {value}
      </p>
    </div>
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

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function Actions({
  onCancel,
  onSave,
  saveText,
}) {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t">
      <button
        type="button"
        onClick={onCancel}
        className="px-5 py-2 border rounded-lg hover:bg-slate-100"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSave}
        className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
      >
        <Save size={18} />
        {saveText}
      </button>
    </div>
  );
}

export default RecepcionList;
