import { useEffect, useState } from "react";
import {
  FileText,
  MessageSquare,
  Truck,
} from "lucide-react";

const proveedoresBase = ["AUTOBAHN", "IMPACTO SOLAR"];

function PedidoInfo({ pedido, setPedido }) {
  const [modoProveedor, setModoProveedor] = useState("");
  const proveedorSeleccionado =
    modoProveedor ||
    (proveedoresBase.includes(pedido.proveedor)
      ? pedido.proveedor
      : pedido.proveedor
      ? "OTRO"
      : "");

  useEffect(() => {
    if (!pedido.proveedor && modoProveedor !== "OTRO") {
      setModoProveedor("");
    }
  }, [modoProveedor, pedido.proveedor]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
        <h2 className="text-xl font-bold text-slate-800">
          Informacion general
        </h2>
        <p className="text-sm text-slate-500">
          Datos principales del pedido al proveedor.
        </p>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Codigo del pedido
          </label>
          <div className="relative">
            <FileText
              size={18}
              className="absolute left-3 top-3.5 text-slate-400"
            />
            <input
              type="text"
              placeholder="Ej: PED-2026-001"
              value={pedido.codigoPedido}
              onChange={(event) =>
                setPedido({
                  ...pedido,
                  codigoPedido: event.target.value.toUpperCase(),
                })
              }
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Proveedor
          </label>
          <div className="relative">
            <Truck
              size={18}
              className="absolute left-3 top-3.5 text-slate-400"
            />
            <select
              value={proveedorSeleccionado}
              onChange={(event) => {
                const value = event.target.value;

                setModoProveedor(value);
                setPedido({
                  ...pedido,
                  proveedor: value === "OTRO" ? "" : value,
                });
              }}
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">Seleccione proveedor</option>
              {proveedoresBase.map((proveedor) => (
                <option key={proveedor} value={proveedor}>
                  {proveedor}
                </option>
              ))}
              <option value="OTRO">Crear otro proveedor</option>
            </select>
          </div>

          {proveedorSeleccionado === "OTRO" && (
            <input
              type="text"
              placeholder="Nombre del nuevo proveedor"
              value={pedido.proveedor}
              onChange={(event) =>
                setPedido({
                  ...pedido,
                  proveedor: event.target.value.toUpperCase(),
                })
              }
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          )}
        </div>

        <div className="lg:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Observaciones
          </label>
          <div className="relative">
            <MessageSquare
              size={18}
              className="absolute left-3 top-4 text-slate-400"
            />
            <textarea
              rows={4}
              placeholder="Escriba alguna observacion del pedido..."
              value={pedido.observaciones}
              onChange={(event) =>
                setPedido({
                  ...pedido,
                  observaciones: event.target.value.toUpperCase(),
                })
              }
              className="w-full resize-none rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PedidoInfo;
