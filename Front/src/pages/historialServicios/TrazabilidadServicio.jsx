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
  const filas = eventos.map((evento, indice) => {
    const siguiente = eventos.slice(indice + 1).find((item) => item.proceso === evento.proceso);
    const cerrado = (evento.proceso === "CALIDAD" && evento.estado === "APROBADA")
      || (evento.proceso === "AVISO_VEHICULO_LISTO" && ["ENVIADO", "ERROR"].includes(evento.estado))
      || (evento.proceso === "RESPUESTA_CLIENTE" && evento.estado === "SIN_BLOQUEO")
      || (evento.proceso === "SERVICIO" && ["FINALIZADA", "CANCELADA"].includes(evento.estado))
      || (evento.proceso.startsWith("INSTALACION:") && evento.estado === "COMPLETADA")
      || (evento.proceso === "PAGO" && ["PAGADO", "NO_APLICA"].includes(evento.estado))
      || (evento.proceso === "PROPUESTA_CORTE" && evento.estado === "MATERIAL_LISTO")
      || (evento.proceso.startsWith("FIRMA:") && ["FIRMADO", "INVALIDADO", "RECHAZADO", "CORRECCION_SOLICITADA"].includes(evento.estado))
      || (evento.proceso.startsWith("CORREO:") && ["ENVIADO", "ERROR"].includes(evento.estado));
    const fin = siguiente ? new Date(siguiente.fecha).getTime() : cerrado ? new Date(evento.fecha).getTime() : ahora;
    return { ...evento, minutos: Math.max(0, Math.floor((fin - new Date(evento.fecha).getTime()) / 60000)), activo: !siguiente && !cerrado };
  });
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
