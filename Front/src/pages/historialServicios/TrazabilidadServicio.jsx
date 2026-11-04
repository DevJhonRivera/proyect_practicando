import { useEffect, useState } from "react";

const fecha = (value) => new Date(value).toLocaleString("es-CO", { timeZone: "America/Bogota" });
const etiqueta = (value) => String(value || "").replaceAll("_", " ");
export default function TrazabilidadServicio({ asesoria }) {
  const eventos = asesoria.trazabilidad || [];
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const etapasServicio = eventos.filter((evento) => evento.proceso === "SERVICIO");
  const turnosPago = etapasServicio.flatMap((evento, indice) => {
    if (evento.estado !== "PENDIENTE_PAGO") return [];
    const salida = etapasServicio[indice + 1];
    return [{ entrada: evento, inicio: new Date(evento.fecha).getTime(), fin: salida ? new Date(salida.fecha).getTime() : ahora, salida }];
  });
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
    const cierreInmediato = cerrado && ["PAGO", "PROPUESTA_CORTE"].includes(evento.proceso);
    const fin = siguiente && !cierreInmediato
      ? new Date(siguiente.fecha).getTime() : cerrado ? inicio : ahora;
    const fila = (desde, hasta, activo) => ({
      ...evento, fecha: new Date(desde), minutos: Math.max(0, Math.floor((hasta - desde) / 60000)), activo,
    });
    if (evento.proceso === "PROPUESTA_CORTE" && evento.estado === "PENDIENTE") return [];
    if (evento.proceso === "PAGO" && !cerrado) {
      // Older records can contain a pending payment from order creation.
      return turnosPago.flatMap((turno) => {
        const desde = Math.max(inicio, turno.inicio);
        const hasta = Math.min(fin, turno.fin);
        const activo = !siguiente && !turno.salida;
        if (desde > hasta || (desde === hasta && !activo)) return [];
        return [{
          ...fila(desde, hasta, activo),
          usuarioNombre: desde > inicio ? turno.entrada.usuarioNombre : evento.usuarioNombre,
        }];
      });
    }
    return [fila(inicio, fin, !siguiente && !cerrado)];
  }).sort((a, b) => a.fecha - b.fecha);
  const etapas = filas.filter((item) => item.proceso === "SERVICIO");
  const mayor = etapas.reduce((max, item) => !max || item.minutos > max.minutos ? item : max, null);
  return <section className="mt-5 rounded-xl border border-slate-200 p-4">
    <h3 className="font-bold text-slate-900">Tiempos e historial del servicio</h3>
    {mayor && <p className="mt-2 text-sm text-amber-800">Mayor permanencia: {etiqueta(mayor.estado)} · {mayor.minutos} min{mayor.activo ? " (en curso)" : ""}</p>}
    <p className="mt-2 text-xs text-slate-500">Horas de Colombia. La permanencia incluye espera y trabajo; no equivale por si sola a tiempo productivo.</p>
    {!filas.length ? <p className="mt-3 text-sm text-slate-500">Sin eventos registrados. El seguimiento comienza con los proximos cambios; no se reconstruyen horas anteriores.</p> : <div className="mt-3 max-h-80 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Proceso / estado</th><th className="p-2">Fecha y hora</th><th className="p-2">Responsable</th><th className="p-2">Minutos</th></tr></thead><tbody>{filas.map((item, index) => <tr key={index} className="border-t"><td className="p-2">{item.proceso.startsWith("INSTALACION:") ? "INSTALACION" : etiqueta(item.proceso.split(":").slice(0, 2).join(" "))}<br />{etiqueta(item.estado)}</td><td className="p-2">{fecha(item.fecha)}</td><td className="p-2">{item.usuarioNombre || "Sistema"}</td><td className="p-2">{item.minutos}{item.activo ? " · en curso" : ""}</td></tr>)}</tbody></table></div>}
    <p className="mt-3 text-xs text-slate-600">Seguro del vehiculo: {etiqueta(asesoria.seguroVehiculo?.estado || "SIN_CONFIRMAR")}</p>
  </section>;
}
