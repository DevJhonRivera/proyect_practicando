import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  AlertTriangle,
  Bell,
  Check,
  X,
} from "lucide-react";

import {
  atenderAlerta,
  getAlertas
} from "../../api/alertas";
import { obtenerUsuarioActual } from "../../utils/permisos";

const TIPO_STOCK_RESERVA_UN_ROLLO =
  "STOCK_RESERVA_UN_ROLLO";
const TIPO_STOCK_RESERVA_DOS_ROLLOS =
  "STOCK_RESERVA_DOS_ROLLOS";
const TIPO_RECEPCION_NUEVA =
  "RECEPCION_NUEVA";
const TIPO_SERVICIO_ASESOR_NUEVO =
  "SERVICIO_ASESOR_NUEVO";
const TIPO_SERVICIO_LISTO_PAGO =
  "SERVICIO_LISTO_PAGO";
const TIPOS_NOTIFICABLES = [
  TIPO_STOCK_RESERVA_UN_ROLLO,
  TIPO_STOCK_RESERVA_DOS_ROLLOS,
  TIPO_RECEPCION_NUEVA,
  TIPO_SERVICIO_ASESOR_NUEVO
];

function StockReservaNotifier() {
  const usuario = obtenerUsuarioActual();
  const [alertas, setAlertas] = useState([]);
  const notificadasRef = useRef(
    new Set(
      JSON.parse(
        sessionStorage.getItem(
          "stockReservaAlertasNotificadas"
        ) || "[]"
      )
    )
  );
  const ocultasRef = useRef(
    new Set(
      JSON.parse(
        sessionStorage.getItem(
          "stockReservaAlertasOcultas"
        ) || "[]"
      )
    )
  );

  useEffect(() => {
    if (!["INVENTARIO", "VENTAS"].includes(usuario?.rol)) {
      setAlertas([]);
      return undefined;
    }

    let active = true;
    let intervalId;

    const cargarAlertas = async () => {
      try {
        const res = await getAlertas();
        const data =
          res.data.data || res.data || [];

        const tiposRol = usuario?.rol === "VENTAS"
          ? [TIPO_SERVICIO_LISTO_PAGO]
          : TIPOS_NOTIFICABLES;
        const pendientes = data.filter(
          (alerta) =>
            tiposRol.includes(
              alerta.tipo
            ) &&
            !alerta.atendida &&
            !ocultasRef.current.has(alerta._id)
        );

        if (!active) {
          return;
        }

        setAlertas(pendientes);

        const nueva = pendientes.find(
          (alerta) =>
            !notificadasRef.current.has(
              alerta._id
            )
        );

        if (nueva) {
          notificadasRef.current.add(nueva._id);
          sessionStorage.setItem(
            "stockReservaAlertasNotificadas",
            JSON.stringify(
              Array.from(notificadasRef.current)
            )
          );

          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "warning",
            title:
              nueva.tipo === TIPO_SERVICIO_LISTO_PAGO
                ? "Servicio listo para pago"
                : nueva.tipo === TIPO_SERVICIO_ASESOR_NUEVO
                ? "Nuevo servicio para corte"
                : nueva.tipo === TIPO_RECEPCION_NUEVA
                ? "Nueva recepcion"
                : "Alerta de bodega",
            text: nueva.mensaje,
            showConfirmButton: false,
            timer: 6000,
            timerProgressBar: true,
          });
        }
      } catch {
        if (active) {
          setAlertas([]);
        }
      }
    };

    cargarAlertas();
    intervalId = window.setInterval(
      cargarAlertas,
      30000
    );

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [usuario?.rol]);

  if (
    !["INVENTARIO", "VENTAS"].includes(usuario?.rol) ||
    alertas.length === 0
  ) {
    return null;
  }

  const principal = alertas[0];
  const adicionales =
    alertas.length - 1;
  const esRecepcion =
    principal.tipo === TIPO_RECEPCION_NUEVA;
  const esServicio =
    principal.tipo === TIPO_SERVICIO_ASESOR_NUEVO;
  const esPago =
    principal.tipo === TIPO_SERVICIO_LISTO_PAGO;

  const quitarPrincipal = async () => {
    try {
      await atenderAlerta(principal._id);

      setAlertas((actuales) =>
        actuales.filter(
          (alerta) =>
            alerta._id !== principal._id
        )
      );
    } catch {
      Swal.fire({
        icon: "error",
        title: "No se pudo quitar la alerta",
        text: "Intentalo de nuevo.",
      });
    }
  };

  const ocultarAviso = () => {
    alertas.forEach((alerta) => {
      ocultasRef.current.add(alerta._id);
    });

    sessionStorage.setItem(
      "stockReservaAlertasOcultas",
      JSON.stringify(
        Array.from(ocultasRef.current)
      )
    );

    setAlertas([]);
  };

  return (
    <div className="fixed right-5 bottom-5 z-50 w-[min(360px,calc(100vw-2.5rem))]">
      <div className="rounded-2xl border border-red-200 bg-white shadow-2xl overflow-hidden">
        <div className={`${esRecepcion || esServicio || esPago ? "bg-blue-600" : "bg-red-600"} text-white px-4 py-3 flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/20 rounded-xl p-2">
              <Bell size={18} />
            </div>

            <div className="min-w-0">
              <p className="font-bold">
                {esPago
                  ? "Servicio listo para pago"
                  : esServicio
                  ? "Nuevo servicio para corte"
                  : esRecepcion
                  ? "Nueva recepcion"
                  : "Alerta de bodega"}
              </p>
              <p className={`${esRecepcion || esServicio || esPago ? "text-blue-100" : "text-red-100"} text-xs`}>
                {esPago
                  ? "Continúe la orden en Ventas"
                  : esServicio
                  ? "Orden enviada por un asesor"
                  : esRecepcion
                  ? "Entrada pendiente por clasificar"
                  : "Stock minimo por material"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={ocultarAviso}
            className="rounded-lg p-1.5 text-white/90 hover:bg-white/20"
            title="Ocultar aviso"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-3">
            <AlertTriangle className={`${esRecepcion || esServicio || esPago ? "text-blue-600" : "text-red-600"} shrink-0 mt-0.5`} />

            <div className="min-w-0">
              <p className="text-sm text-slate-700">
                {principal.mensaje}
              </p>

              {adicionales > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Hay {adicionales} alerta
                  {adicionales === 1 ? "" : "s"} mas
                  pendiente
                  {adicionales === 1 ? "" : "s"}.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={quitarPrincipal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
            >
              <Check size={16} />
              Atender
            </button>

            <Link
              to={principal.accionUrl || "/alertas"}
              className={`${esRecepcion || esServicio || esPago ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"} inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white transition`}
            >
              {esPago ? "Abrir venta" : esServicio ? "Abrir corte" : "Ver alertas"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockReservaNotifier;
