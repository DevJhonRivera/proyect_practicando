import { useState } from "react";
import api from "../../api/axios";
import { obtenerUsuarioActual } from "../../utils/permisos";

export default function GestionRespuestaCliente({ asesoria, onGestion }) {
  const [accion, setAccion] = useState("PREPARAR_REVISION");
  const [nota, setNota] = useState("");
  const [estadoVehiculo, setEstadoVehiculo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const documento = [...(asesoria.autorizaciones?.documentos || [])].reverse().find((d) => d.respuestaCliente?.fecha && !d.gestionRespuesta?.fecha);
  if (!asesoria.autorizaciones?.bloqueoCliente || !documento || asesoria.estado === "CANCELADA") return null;
  const respuesta = documento.respuestaCliente;
  const esAdmin = ["ADMIN", "SUPERUSUARIO"].includes(obtenerUsuarioActual()?.rol);
  const gestionar = async (e) => {
    e.preventDefault(); setOcupado(true); setError("");
    try {
      await api.post(`/autorizaciones/servicios/${asesoria._id}/respuesta`, { accion, nota, estadoVehiculo });
      await onGestion();
    } catch (err) { setError(err.response?.data?.message || "No se pudo actualizar la gestión"); }
    finally { setOcupado(false); }
  };
  return <section className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
    <h4 className="font-bold text-amber-950">Servicio bloqueado: {documento.estado === "RECHAZADO" ? "documento rechazado" : "corrección solicitada"}</h4>
    <p className="mt-2 text-sm font-semibold">{documento.tipo} · {respuesta.nombre} · {new Date(respuesta.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p>
    <p className="mt-2 whitespace-pre-wrap break-words text-sm">{respuesta.motivo}</p>
    <form onSubmit={gestionar} className="mt-4 space-y-3"><fieldset disabled={ocupado} className="space-y-3">
      <label className="block text-sm font-semibold">Acción<select value={accion} onChange={(e) => setAccion(e.target.value)} className="mt-1 w-full rounded border bg-white p-2"><option value="PREPARAR_REVISION">Preparar nueva versión para aprobación</option>{esAdmin && <option value="CERRAR">Cerrar solicitud / cancelar servicio</option>}</select></label>
      <label className="block text-sm font-semibold">Gestión realizada<textarea required minLength={5} maxLength={2000} rows={3} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Registra los cambios que prepararás o el acuerdo de cierre con el cliente" className="mt-1 w-full rounded border bg-white p-2" /></label>
      {accion === "CERRAR" && <label className="block text-sm font-semibold">Situación del vehículo<select required value={estadoVehiculo} onChange={(e) => setEstadoVehiculo(e.target.value)} className="mt-1 w-full rounded border bg-white p-2"><option value="">Selecciona una confirmación</option><option value="NO_RECIBIDO">Confirmo que el vehículo no ingresó a la empresa</option><option value="DEVUELTO">Confirmo que el vehículo ya fue devuelto al cliente</option></select><span className="mt-2 block text-xs font-normal">Si aún está en custodia, coordina primero la devolución. Registra en la nota a quién se entregó y cómo quedó documentada. El cierre conserva los controles de pagos e inventario.</span></label>}
      <p className="text-xs text-amber-900">Preparar una revisión permite corregir y reenviar; el rechazo anterior se conserva y sigue siendo necesaria una nueva firma. El cierre lo realiza Administración.</p>
      <button disabled={ocupado} className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{ocupado ? "Guardando..." : accion === "CERRAR" ? "Confirmar cierre de la solicitud" : "Registrar gestión y preparar revisión"}</button>
    </fieldset></form>
    {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
  </section>;
}
