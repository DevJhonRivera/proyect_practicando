import { useEffect, useState } from "react";

import { duracion, etiqueta, fechaColombia as fecha } from "./formato";
export default function TrazabilidadServicio({ asesoria }) {
  const historial = asesoria.trazabilidad;
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const eventos = (historial || []).filter((evento) => evento.fecha && Number.isFinite(+new Date(evento.fecha)))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const etapasServicio = eventos.filter((evento) => evento.proceso === "SERVICIO");
  const turnosPago = etapasServicio.flatMap((evento, indice) => {
    if (evento.estado !== "PENDIENTE_PAGO") return [];
    const salida = etapasServicio[indice + 1];
    return [{ entrada: evento, inicio: new Date(evento.fecha).getTime(), fin: salida ? new Date(salida.fecha).getTime() : ahora, salida }];
  });
  const terminal = etapasServicio.findLast((evento) => ["FINALIZADA", "CANCELADA"].includes(evento.estado));
  const finOrden = ["FINALIZADA", "CANCELADA"].includes(asesoria.flujo?.etapa) && terminal
    ? +new Date(terminal.fecha) : ahora;
  const filas = eventos.flatMap((evento, indice) => {
    const siguiente = eventos.slice(indice + 1).find((item) => item.proceso === evento.proceso);
    const cerrado = (evento.proceso === "CALIDAD" && evento.estado === "APROBADA")
      || (evento.proceso === "AVISO_VEHICULO_LISTO" && ["ENVIADO", "ERROR"].includes(evento.estado))
      || (evento.proceso === "RESPUESTA_CLIENTE" && evento.estado === "SIN_BLOQUEO")
      || (evento.proceso === "SERVICIO" && ["FINALIZADA", "CANCELADA"].includes(evento.estado))
      || (evento.proceso.startsWith("INSTALACION:") && evento.estado === "COMPLETADA")
      || (evento.proceso === "PAGO" && ["PAGADO", "NO_APLICA"].includes(evento.estado))
      || (evento.proceso === "PROPUESTA_CORTE" && ["MATERIAL_LISTO", "RECHAZADA"].includes(evento.estado))
      || (evento.proceso.startsWith("FIRMA:") && ["FIRMADO", "INVALIDADO", "RECHAZADO", "CORRECCION_SOLICITADA"].includes(evento.estado))
      || (evento.proceso.startsWith("CORREO:") && ["ENVIADO", "ERROR"].includes(evento.estado));
    const inicio = new Date(evento.fecha).getTime();

    const fin = siguiente && !cerrado
      ? new Date(siguiente.fecha).getTime() : cerrado ? inicio : Math.max(inicio, finOrden);
    const fila = (desde, hasta, activo) => ({
      ...evento, fecha: new Date(desde), minutos: Math.max(0, Math.floor((hasta - desde) / 60000)), activo,
    });
    if (evento.proceso === "PROPUESTA_CORTE" && evento.estado === "PENDIENTE") return [];
    if (evento.proceso === "PAGO" && !cerrado) {
      // Older records can contain a pending payment from order creation.
      return turnosPago.flatMap((turno) => {
        const desde = Math.max(inicio, turno.inicio);
        const hasta = Math.min(fin, turno.fin);
        const activo = !siguiente && !turno.salida && finOrden === ahora;
        if (desde > hasta || (desde === hasta && !activo)) return [];
        return [{
          ...fila(desde, hasta, activo),
          usuarioNombre: desde > inicio ? turno.entrada.usuarioNombre : evento.usuarioNombre,
        }];
      });
    }
    return [fila(inicio, fin, !siguiente && !cerrado && finOrden === ahora)];
  }).sort((a, b) => a.fecha - b.fecha);
  const etapas = filas.filter((item) => item.proceso === "SERVICIO" && !["FINALIZADA", "CANCELADA"].includes(item.estado));
  const mayor = etapas.reduce((max, item) => !max || item.minutos > max.minutos ? item : max, null);
  const contexto = [
    ...(asesoria.auditoria || []).map((item) => ({ ...item, titulo: item.accion })),
    ...(asesoria.novedades || []).map((item) => ({ ...item, titulo: item.tipo, detalle: item.estado })),
    ...(asesoria.autorizaciones?.documentos || []).map(({ tipo, respuestaCliente }) => ({
      titulo: "Respuesta del cliente", detalle: tipo, descripcion: respuestaCliente?.motivo, fecha: respuestaCliente?.fecha,
    })),
  ].filter((item) => item.descripcion?.trim()).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return <div className="mt-4 space-y-5">
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-bold text-slate-900">Tiempos y cambios de estado</h3>
      {mayor && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Mayor permanencia · {etiqueta(mayor.estado)} · {duracion(mayor.minutos * 60000)}{mayor.activo ? " (en curso)" : ""}
      </p>}
      <p className="mt-2 text-xs text-slate-600">Horas de Colombia. Los procesos pueden ocurrir en paralelo y sus tiempos pueden coincidir.</p>
      {!filas.length ? <p className="mt-3 text-sm text-slate-600">Sin eventos registrados. El seguimiento empieza con los próximos cambios de la orden.</p> :
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-100"><tr><th className="p-2">Proceso / estado</th><th className="p-2">Fecha y hora</th><th className="p-2">Registrado por</th><th className="p-2">Permanencia</th></tr></thead>
            <tbody>{filas.map((item, index) => <tr key={index} className="border-t border-slate-200">
              <td className="p-2">
                <span className="text-xs text-slate-600">{etiqueta(item.proceso.split(":").slice(0, item.proceso.startsWith("INSTALACION:") ? 1 : 2).join(" "))}</span>
                <p className="font-medium">{etiqueta(item.estado)}</p>
              </td>
              <td className="p-2">{fecha(item.fecha)}</td><td className="p-2">{item.usuarioNombre || "Sistema"}</td>
              <td className="p-2">{duracion(item.minutos * 60000)}{item.activo && <span className="block text-xs font-semibold text-blue-700">En curso</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      <p className="mt-3 text-xs text-slate-600">Seguro del vehículo · {etiqueta(asesoria.seguroVehiculo?.estado || "SIN_CONFIRMAR")}</p>
    </section>
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-bold">Novedades y observaciones registradas</h3>
      {contexto.length ? <ul className="mt-2 max-h-80 divide-y divide-slate-200 overflow-auto">
        {contexto.map((item, index) => <li key={index} className="py-3 text-sm">
          <p className="font-semibold">{etiqueta(item.titulo)}{item.detalle ? " · " + etiqueta(item.detalle) : ""}</p>
          <p className="whitespace-pre-wrap break-words">{item.descripcion}</p>
          <p className="mt-1 text-xs text-slate-600">{fecha(item.fecha)}{item.usuarioNombre ? " · " + item.usuarioNombre : ""}</p>
        </li>)}
      </ul> : <p className="mt-2 text-sm text-slate-600">No hay observaciones registradas para esta orden.</p>}
    </section>
  </div>;
}
