import { useState } from "react";
import Swal from "sweetalert2";
import {
  Eye,
  Pencil,
  PackageCheck,
  Save,
  X,
} from "lucide-react";

import { updatePedido } from "../../../api/pedidos.api";
import ExcelButton from "../../../components/ui/ExcelButton";
import { anchoLabel } from "../../../utils/anchos";
import { etiquetaDetalle } from "../../../utils/materiales";

function PedidoTable({ pedidos, onRefresh }) {
  const [viewPedido, setViewPedido] =
    useState(null);

  const [editPedido, setEditPedido] =
    useState(null);

  const [editForm, setEditForm] =
    useState({
      codigoPedido: "",
      proveedor: "",
      observaciones: "",
    });

  const badgeEstado = (estado) => {
    switch (estado) {
      case "COMPLETADO":
        return "bg-green-100 text-green-700";
      case "PARCIAL":
        return "bg-orange-100 text-orange-700";
      case "CANCELADO":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const totalRollos = (pedido) =>
    pedido.detalles?.reduce(
      (acc, item) =>
        acc + Number(item.cantidadRollos || 0),
      0
    ) || 0;

  const pendientes = (pedido) =>
    pedido.detalles?.filter(
      (detalle) =>
        Number(detalle.cantidadRecibida || 0) <
        Number(detalle.cantidadRollos || 0)
    ) || [];

  const excelColumns = [
    {
      header: "Codigo",
      value: (pedido) => pedido.codigoPedido,
    },
    {
      header: "Proveedor",
      value: (pedido) => pedido.proveedor,
      width: 24,
    },
    {
      header: "Referencias",
      value: (pedido) => pedido.detalles?.length || 0,
    },
    {
      header: "Rollos",
      value: totalRollos,
    },
    {
      header: "Estado",
      value: (pedido) => pedido.estado,
    },
    {
      header: "Fecha",
      value: (pedido) =>
        pedido.createdAt
          ? new Date(pedido.createdAt)
          : "",
      numFmt: "dd/mm/yyyy",
    },
    {
      header: "Observaciones",
      value: (pedido) => pedido.observaciones || "",
      width: 32,
    },
  ];

  const abrirEdicion = (pedido) => {
    setEditPedido(pedido);
    setEditForm({
      codigoPedido: pedido.codigoPedido || "",
      proveedor: pedido.proveedor || "",
      observaciones: pedido.observaciones || "",
    });
  };

  const verPendientes = (pedido) => {
    const materialesPendientes =
      pendientes(pedido);

    if (materialesPendientes.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Pedido completo",
        text:
          "Este pedido no tiene materiales pendientes por recepcionar.",
      });

      return;
    }

    Swal.fire({
      icon: "info",
      title: "Material pendiente",
      html: `
        <div style="text-align:left">
          <p>Clasifica los rollos desde <strong>Entrada de mercancia</strong>.</p>
          <ul style="margin-top:10px;padding-left:18px">
            ${materialesPendientes
              .map((detalle) => {
                const recibidos = Number(
                  detalle.cantidadRecibida || 0
                );
                const solicitados = Number(
                  detalle.cantidadRollos || 0
                );

                return `<li>${detalle.tipoPolarizado} ${etiquetaDetalle(detalle)}: ${solicitados - recibidos} pendientes</li>`;
              })
              .join("")}
          </ul>
        </div>
      `,
    });
  };

  const guardarEdicion = async () => {
    try {
      if (
        !editForm.codigoPedido ||
        !editForm.proveedor
      ) {
        return Swal.fire({
          icon: "warning",
          title: "Complete los campos requeridos",
        });
      }

      await updatePedido(
        editPedido._id,
        editForm
      );

      setEditPedido(null);

      await onRefresh?.();

      Swal.fire({
        icon: "success",
        title: "Pedido actualizado",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message ||
          "No fue posible actualizar el pedido",
      });
    }
  };

  if (pedidos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <PackageCheck
          size={70}
          className="mx-auto text-slate-300"
        />

        <h2 className="mt-4 text-xl font-bold text-slate-700">
          No existen pedidos
        </h2>

        <p className="text-slate-500">
          Cree el primer pedido para comenzar.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800">
            Listado de Pedidos
          </h2>

          <ExcelButton
            title="Listado de Pedidos"
            fileName="pedidos"
            sheetName="Pedidos"
            columns={excelColumns}
            rows={pedidos}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left">
                  Codigo
                </th>
                <th className="p-4 text-left">
                  Proveedor
                </th>
                <th className="p-4 text-center">
                  Referencias
                </th>
                <th className="p-4 text-center">
                  Rollos
                </th>
                <th className="p-4 text-center">
                  Estado
                </th>
                <th className="p-4 text-center">
                  Fecha
                </th>
                <th className="p-4 text-center">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {pedidos.map((pedido) => (
                <tr
                  key={pedido._id}
                  className="border-t hover:bg-slate-50 transition"
                >
                  <td className="p-4 font-semibold">
                    {pedido.codigoPedido}
                  </td>

                  <td className="p-4">
                    {pedido.proveedor}
                  </td>

                  <td className="text-center">
                    {pedido.detalles?.length || 0}
                  </td>

                  <td className="text-center font-semibold text-blue-600">
                    {totalRollos(pedido)}
                  </td>

                  <td className="text-center">
                    <span
                      className={`
                        px-3
                        py-1
                        rounded-full
                        text-sm
                        font-semibold
                        ${badgeEstado(pedido.estado)}
                      `}
                    >
                      {pedido.estado}
                    </span>
                  </td>

                  <td className="text-center">
                    {new Date(
                      pedido.createdAt
                    ).toLocaleDateString()}
                  </td>

                  <td>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setViewPedido(pedido)
                        }
                        className="
                          bg-blue-100
                          hover:bg-blue-200
                          text-blue-700
                          p-2
                          rounded-lg
                        "
                        title="Ver"
                      >
                        <Eye size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          abrirEdicion(pedido)
                        }
                        className="
                          bg-amber-100
                          hover:bg-amber-200
                          text-amber-700
                          p-2
                          rounded-lg
                        "
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          verPendientes(pedido)
                        }
                        className="
                          bg-green-100
                          hover:bg-green-200
                          text-green-700
                          p-2
                          rounded-lg
                          disabled:opacity-40
                          disabled:cursor-not-allowed
                        "
                        title="Ver pendientes"
                        disabled={
                          pedido.estado ===
                          "COMPLETADO"
                        }
                      >
                        <PackageCheck size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewPedido && (
        <PedidoModal
          title={`Pedido ${viewPedido.codigoPedido}`}
          onClose={() => setViewPedido(null)}
        >
          <PedidoDetalle pedido={viewPedido} />
        </PedidoModal>
      )}

      {editPedido && (
        <PedidoModal
          title="Editar pedido"
          onClose={() => setEditPedido(null)}
        >
          <div className="space-y-4">
            <Field label="Codigo">
              <input
                value={editForm.codigoPedido}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    codigoPedido:
                      event.target.value,
                  })
                }
                className="w-full border rounded-lg p-3"
              />
            </Field>

            <Field label="Proveedor">
              <input
                value={editForm.proveedor}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    proveedor:
                      event.target.value,
                  })
                }
                className="w-full border rounded-lg p-3"
              />
            </Field>

            <Field label="Observaciones">
              <textarea
                rows="3"
                value={editForm.observaciones}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    observaciones:
                      event.target.value,
                  })
                }
                className="w-full border rounded-lg p-3"
              />
            </Field>

            <ModalActions
              onCancel={() => setEditPedido(null)}
              onSave={guardarEdicion}
              saveText="Guardar"
            />
          </div>
        </PedidoModal>
      )}

    </>
  );
}

function PedidoDetalle({ pedido }) {
  const detalleColumns = [
    {
      header: "Material",
      value: (detalle) => detalle.tipoPolarizado,
      width: 24,
    },
    {
      header: "Clasificacion",
      value: etiquetaDetalle,
    },
    {
      header: "Ancho",
      value: (detalle) => anchoLabel(detalle.ancho),
    },
    {
      header: "Pedidos",
      value: (detalle) => Number(detalle.cantidadRollos || 0),
    },
    {
      header: "Recibidos",
      value: (detalle) => Number(detalle.cantidadRecibida || 0),
    },
    {
      header: "Pendientes",
      value: (detalle) =>
        Math.max(
          Number(detalle.cantidadRollos || 0) -
            Number(detalle.cantidadRecibida || 0),
          0
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <Info label="Proveedor" value={pedido.proveedor} />
        <Info label="Estado" value={pedido.estado} />
        <Info
          label="Fecha"
          value={new Date(
            pedido.createdAt
          ).toLocaleDateString()}
        />
        <Info
          label="Observaciones"
          value={pedido.observaciones || "-"}
        />
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <div className="p-3 border-b flex justify-end">
          <ExcelButton
            title={`Detalle Pedido ${pedido.codigoPedido}`}
            fileName={`detalle-pedido-${pedido.codigoPedido}`}
            sheetName="Detalle Pedido"
            columns={detalleColumns}
            rows={pedido.detalles || []}
          />
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
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
                Pedidos
              </th>
              <th className="p-3 text-left">
                Recibidos
              </th>
              <th className="p-3 text-left">
                Pendientes
              </th>
            </tr>
          </thead>

          <tbody>
            {pedido.detalles?.map((detalle) => {
              const recibidos = Number(
                detalle.cantidadRecibida || 0
              );
              const solicitados = Number(
                detalle.cantidadRollos || 0
              );

              return (
                <tr
                  key={detalle._id}
                  className="border-t"
                >
                  <td className="p-3">
                    {detalle.tipoPolarizado}
                  </td>
                  <td className="p-3">
                    {etiquetaDetalle(detalle)}
                  </td>
                  <td className="p-3">
                    {anchoLabel(detalle.ancho)}
                  </td>
                  <td className="p-3">
                    {solicitados}
                  </td>
                  <td className="p-3">
                    {recibidos}
                  </td>
                  <td className="p-3 font-semibold">
                    {Math.max(
                      solicitados - recibidos,
                      0
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PedidoModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-5">
          <h2 className="text-xl font-bold text-slate-800">
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

function Info({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-slate-500">
        {label}
      </p>
      <p className="font-semibold text-slate-800 mt-1">
        {value}
      </p>
    </div>
  );
}

function ModalActions({
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
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
      >
        <Save size={18} />
        {saveText}
      </button>
    </div>
  );
}

export default PedidoTable;
