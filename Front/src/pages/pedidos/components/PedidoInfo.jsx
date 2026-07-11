import { useEffect, useState } from "react";
import {
  FileText,
  Truck,
  MessageSquare
} from "lucide-react";

const proveedoresBase = ["AUTOBAHN", "IMPACTO SOLAR"];

function PedidoInfo({
  pedido,
  setPedido
}) {
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

    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">

      <div className="border-b px-6 py-4">

        <h2 className="text-xl font-bold text-slate-800">
          Información General
        </h2>

        <p className="text-sm text-slate-500">
          Datos principales del pedido al proveedor.
        </p>

      </div>

      <div className="p-6 grid lg:grid-cols-2 gap-6">

        {/* Código */}

        <div>

          <label className="text-sm font-medium text-slate-600 mb-2 block">
            Código del Pedido
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
              onChange={(e) =>
                setPedido({
                  ...pedido,
                  codigoPedido: e.target.value,
                })
              }
              className="w-full border rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />

          </div>

        </div>

        {/* Proveedor */}

        <div>

          <label className="text-sm font-medium text-slate-600 mb-2 block">
            Proveedor
          </label>

          <div className="relative">

            <Truck
              size={18}
              className="absolute left-3 top-3.5 text-slate-400"
            />

            <select
              value={proveedorSeleccionado}
              onChange={(e) => {
                const value = e.target.value;

                setModoProveedor(value);
                setPedido({
                  ...pedido,
                  proveedor: value === "OTRO" ? "" : value,
                });
              }}
              className="w-full border rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
              onChange={(e) =>
                setPedido({
                  ...pedido,
                  proveedor: e.target.value.toUpperCase(),
                })
              }
              className="mt-3 w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          )}

        </div>

        {/* Observaciones */}

        <div className="lg:col-span-2">

          <label className="text-sm font-medium text-slate-600 mb-2 block">
            Observaciones
          </label>

          <div className="relative">

            <MessageSquare
              size={18}
              className="absolute left-3 top-4 text-slate-400"
            />

            <textarea
              rows={4}
              placeholder="Escriba alguna observación del pedido..."
              value={pedido.observaciones}
              onChange={(e) =>
                setPedido({
                  ...pedido,
                  observaciones: e.target.value,
                })
              }
              className="w-full border rounded-xl pl-10 pr-4 py-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />

          </div>

        </div>

      </div>

    </div>

  );

}

export default PedidoInfo;
