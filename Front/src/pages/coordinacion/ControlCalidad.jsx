import { useState } from "react";
import api from "../../api/axios";

export default function ControlCalidad({ orden, usuario, onChanged }) {
  const [decision, setDecision] = useState("APROBAR");
  const [observacion, setObservacion] = useState("");
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [lineasRecorte, setLineasRecorte] = useState([]);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const calidad = orden.coordinacion?.calidad;
  const asignaciones = orden.coordinacion?.asignaciones || [];
  const ultima = calidad?.revisiones?.at(-1);
  const novedad = (orden.novedades || []).find((n) => String(n._id) === String(ultima?.novedadId));
  const puedeGestionar = ["COORDINADOR", "ADMIN", "SUPERUSUARIO"].includes(usuario?.rol);
  const recorteRechazado = orden.flujo?.etapa === "REPROCESO" && ultima?.decision === "RECORTE" && novedad?.estado === "RECHAZADA";
  const terminadas = asignaciones.length > 0 && asignaciones.every((a) => a.estado === "COMPLETADA");
  const puedeRevisar = puedeGestionar && calidad?.estado !== "APROBADA" && (recorteRechazado || (terminadas && ["PENDIENTE_CALIDAD", "EN_INSTALACION", "MATERIAL_LISTO"].includes(orden.flujo?.etapa)));
  const asignacionRecorte = asignaciones.find((a) => String(a._id) === seleccionadas[0]);
  const lineas = [
    ...(orden.polarizados || []).map((_, i) => ({ linea: `POLARIZADO ${i + 1}`, servicio: `POLARIZADO ${i + 1}` })),
    ...(orden.ppf || []).map((p, i) => ({ linea: `PPF ${i + 1}`, servicio: `PPF ${p.referencia}` })),
  ].filter((l) => l.servicio === asignacionRecorte?.servicio);
  const ejecutar = async (accion, body = {}) => {
    setOcupado(true); setMensaje("");
    try {
      const r = await api.patch(`/coordinacion/ordenes/${orden._id}/${accion}`, body);
      setMensaje(r.data.data?.aviso?.enviado === false ? `Calidad aprobada. Aviso al cliente pendiente: ${r.data.data.aviso.mensaje}` : "Gestión registrada correctamente.");
      setObservacion(""); setSeleccionadas([]); setLineasRecorte([]);
      await onChanged();
    } catch (e) { setMensaje(e.response?.data?.message || "No se pudo registrar la revisión"); }
    finally { setOcupado(false); }
  };
  if (!calidad?.requerida && !terminadas) return null;
  return <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <h3 className="font-bold text-slate-900">Control de calidad · {(calidad?.estado || "PENDIENTE").replaceAll("_", " ")}</h3>
    {ultima && <div className="mt-2 text-sm"><p className="whitespace-pre-wrap break-words">{ultima.observacion}</p><p className="mt-1 text-xs text-slate-500">{ultima.usuarioNombre} · {new Date(ultima.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p></div>}
    {orden.flujo?.etapa === "REPROCESO" && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
      {ultima?.decision === "RECORTE" ? <><p>Recorte: {(novedad?.estado || "PENDIENTE").replaceAll("_", " ")}. {ultima.materialRecibidoEn ? "Material recibido. El instalador ya puede reiniciar." : "El instalador espera el nuevo material."}</p><p className="mt-1 text-xs">Administración aprueba la solicitud; Inventario registra el nuevo corte y su consumo. Coordinación confirma la recepción antes de reiniciar.</p>{puedeGestionar && novedad?.estado === "RESUELTA" && !ultima.materialRecibidoEn && <button disabled={ocupado} onClick={() => ejecutar("recibir-reproceso")} className="mt-3 rounded bg-blue-700 px-3 py-2 font-semibold text-white">Confirmar recepción del material de recorte</button>}{recorteRechazado && <p className="mt-2 font-semibold">El recorte fue rechazado. Registra una corrección sin material o una nueva solicitud de recorte.</p>}</> : <p>Devuelto al instalador para revisar y corregir sin material nuevo. Al completar, volverá a revisión de calidad.</p>}
    </div>}
    {puedeRevisar && <form onSubmit={(e) => { e.preventDefault(); ejecutar("calidad", { decision: recorteRechazado && decision === "APROBAR" ? "CORREGIR" : decision, observacion, asignaciones: seleccionadas, lineasRecorte }); }} className="mt-4 space-y-3"><fieldset disabled={ocupado} className="space-y-3">
      <label className="block text-sm font-semibold">Resultado<select value={recorteRechazado && decision === "APROBAR" ? "CORREGIR" : decision} onChange={(e) => { setDecision(e.target.value); setSeleccionadas([]); setLineasRecorte([]); }} className="mt-1 w-full rounded border bg-white p-2">{!recorteRechazado && <option value="APROBAR">Aprobar calidad y avisar que está listo</option>}<option value="CORREGIR">No aprobar: devolver al instalador sin material nuevo</option><option value="RECORTE">No aprobar: solicitar nuevo corte con aprobación administrativa</option></select></label>
      {(decision !== "APROBAR" || recorteRechazado) && <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Instalaciones a corregir {decision === "RECORTE" ? "(una por solicitud de recorte)" : ""}</legend>{asignaciones.filter((a) => !recorteRechazado || ultima.asignaciones.some((r) => String(r.asignacionId) === String(a._id))).map((a) => <label key={a._id} className="flex items-start gap-2 rounded border bg-white p-2 text-sm"><input type={decision === "RECORTE" ? "radio" : "checkbox"} name="instalacion-calidad" checked={seleccionadas.includes(String(a._id))} onChange={() => { setSeleccionadas((actual) => decision === "RECORTE" ? [String(a._id)] : actual.includes(String(a._id)) ? actual.filter((id) => id !== String(a._id)) : [...actual, String(a._id)]); setLineasRecorte([]); }} className="mt-1" />{a.descripcion || a.servicio} · {a.instaladorNombre}</label>)}</fieldset>}
      {decision === "RECORTE" && <fieldset><legend className="text-sm font-semibold">Material que debe volver a cortarse</legend>{lineas.map((l) => <label key={l.linea} className="mt-2 flex gap-2 text-sm"><input type="checkbox" checked={lineasRecorte.includes(l.linea)} onChange={() => setLineasRecorte((ls) => ls.includes(l.linea) ? ls.filter((v) => v !== l.linea) : [...ls, l.linea])} />{l.linea}</label>)}<p className="mt-2 text-xs text-slate-600">El costo y el consumo quedan ligados al instalador seleccionado mediante el flujo existente de reposición.</p></fieldset>}
      <label className="block text-sm font-semibold">Observaciones de calidad<textarea required minLength={5} maxLength={2000} rows={3} value={observacion} onChange={(e) => setObservacion(e.target.value)} className="mt-1 w-full rounded border bg-white p-2" /></label>
      <p className="text-xs text-slate-500">Se conservarán el responsable, las fechas y los trabajos de cada revisión. La aprobación habilita la entrega y envía los avisos al cliente y al asesor.</p>
      <button disabled={ocupado} className="rounded bg-slate-900 px-4 py-3 text-sm font-bold text-white">{ocupado ? "Guardando..." : "Registrar resultado de calidad"}</button>
    </fieldset></form>}
    {calidad?.estado === "APROBADA" && <div className="mt-3 text-sm"><p className="text-emerald-800">Calidad aprobada. Correo al cliente: {calidad.aviso?.estado || "PENDIENTE"}.</p>{calidad.aviso?.error && <p className="mt-1 text-red-800">{calidad.aviso.error}</p>}{puedeGestionar && (calidad.aviso?.estado !== "ENVIADO" || orden.flujo?.etapa === "PENDIENTE_CALIDAD") && <button disabled={ocupado} onClick={() => ejecutar("calidad", { decision: "APROBAR" })} className="mt-2 rounded border bg-white px-3 py-2">Continuar y reintentar aviso</button>}</div>}
    {!!calidad?.revisiones?.length && <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Historial de calidad ({calidad.revisiones.length})</summary><div className="mt-2 space-y-2">{calidad.revisiones.map((r) => <div key={r._id} className="rounded border bg-white p-3"><p className="font-semibold">{r.decision} · {r.usuarioNombre} · {new Date(r.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p><p className="whitespace-pre-wrap break-words">{r.observacion}</p>{r.asignaciones.map((a) => <p key={a.asignacionId} className="mt-1 text-xs">{a.descripcion || a.servicio} · {a.instaladorNombre}{a.fechaFinalizacion ? ` · Terminada: ${new Date(a.fechaFinalizacion).toLocaleString("es-CO", { timeZone: "America/Bogota" })}` : ""}</p>)}{r.materialRecibidoEn && <p className="mt-2 text-xs">Material recibido por {r.materialRecibidoPor} · {new Date(r.materialRecibidoEn).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p>}</div>)}</div></details>}
    {mensaje && <p role="status" className="mt-3 rounded border bg-white p-3 text-sm">{mensaje}</p>}
  </section>;
}
