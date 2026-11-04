import FotosDiagnostico from "./FotosDiagnostico";
import GestionRespuestaCliente from "./GestionRespuestaCliente";
import AsesoriaFormModal from "./AsesoriaFormModal";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import { getAsesoriaPorId } from "../../api/asesores.api";
import { obtenerUsuarioActual, tienePermiso } from "../../utils/permisos";
import { observarActualizaciones } from "../../utils/tiempoReal";
import DocumentoServicio from "./DocumentoServicio";

const documentosFirma = {
  COTIZACION: "Cotización",
  DIAGNOSTICO: "Diagnóstico",
  ENTREGA: "Entrega",
};

export default function FirmasServicio({ asesoria }) {
  const [actual, setActual] = useState(asesoria);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [vista, setVista] = useState(null);
  const [editarCotizacion, setEditarCotizacion] = useState(false);
  const [diagnostico, setDiagnostico] = useState(null);
  const [procesandoFotos, setProcesandoFotos] = useState(false);
  const cambiarDiagnostico = (campo, valor) => setDiagnostico((d) => ({ ...d, [campo]: valor }));
  const guardarDiagnostico = async (evento) => {
    evento.preventDefault();
    if (diagnostico.fotos.length < 4 || diagnostico.fotos.length > 10 || procesandoFotos) { setMensaje("Agrega de 4 a 10 fotografías antes de guardar el diagnóstico."); return; }
    setOcupado(true); setMensaje("");
    try {
      const { seguroEstado, fotos, ...recepcion } = diagnostico;
      await api.put(`/autorizaciones/servicios/${asesoria._id}/diagnostico`, { recepcion, seguroEstado, fotos });
      setDiagnostico(null);
      setMensaje("Diagnostico guardado. Envie el documento para que el cliente lo revise y firme.");
      await refrescar();
    } catch (e) { setMensaje(e.response?.data?.message || "No se pudo guardar el diagnostico"); }
    finally { setOcupado(false); }
  };
  useEffect(() => {
    let activo = true;
    const dejarDeObservar = observarActualizaciones(["realtime:firma-cliente", "realtime:alertas"], async () => {
      try {
        const respuesta = await getAsesoriaPorId(asesoria._id);
        if (activo) setActual(respuesta.data.data);
      } catch {
        // El próximo evento o la reconexión volverá a consultar el estado.
      }
    }, 5000, (evento) => evento.type !== "realtime:firma-cliente" || evento.detail?.asesoriaId === asesoria._id);
    return () => { activo = false; dejarDeObservar(); };
  }, [asesoria._id]);
  const puedeEmitir = tienePermiso(obtenerUsuarioActual(), "asesores", "write");
  const ultimaCotizacion = [...(actual.autorizaciones?.documentos || [])].reverse().find((d) => d.tipo === "COTIZACION");
  const ultimoDiagnostico = actual.autorizaciones?.documentos?.findLast((d) => d.tipo === "DIAGNOSTICO");
  const corregirDiagnostico = ultimoDiagnostico?.gestionRespuesta?.accion === "PREPARAR_REVISION";
  const enRevision = !actual.autorizaciones?.bloqueoCliente && actual.estado !== "CANCELADA"
    && actual.flujo?.etapa === "PENDIENTE_FIRMA_COTIZACION" && ultimaCotizacion?.gestionRespuesta?.accion === "PREPARAR_REVISION";
  const refrescar = async () => setActual((await getAsesoriaPorId(asesoria._id)).data.data);
  const abrirDiagnostico = async () => {
    setOcupado(true); setMensaje("");
    try {
      const fotos = (await api.get(`/autorizaciones/servicios/${asesoria._id}/fotos`)).data.data;
      setDiagnostico({ tieneRayones: false, detalleRayones: "", dejaObjetos: false, detalleObjetos: "", observaciones: "", ...actual.recepcion, fotos, seguroEstado: actual.seguroVehiculo?.estado || "SIN_CONFIRMAR" });
    } catch (e) { setMensaje(e.response?.data?.message || "No se pudieron cargar las fotos."); }
    finally { setOcupado(false); }
  };
  const abrirDocumento = async (d) => {
    if (vista?._id === d._id) { setVista(null); return; }
    setOcupado(true);
    try { setVista({ ...d, fotos: (await api.get(`/autorizaciones/servicios/${asesoria._id}/fotos`, { params: { documentoId: d._id } })).data.data }); }
    catch (e) { setMensaje(e.response?.data?.message || "No se pudo abrir el registro fotográfico."); }
    finally { setOcupado(false); }
  };
  const emitir = async (tipo) => {
    setOcupado(true); setMensaje("");
    try {
      const respuesta = await api.post(`/autorizaciones/servicios/${asesoria._id}/documentos`, { tipo });
      setMensaje(`Documento enviado a ${respuesta.data.data.correo}. La aceptacion del proveedor no confirma su entrega en la bandeja del cliente.`);
      await refrescar();
    } catch (e) {
      setMensaje(e.response?.data?.message || "No se pudo enviar el documento");
      await refrescar().catch(() => {});
    } finally { setOcupado(false); }
  };
  return <section className="mt-5 rounded-xl border p-4"><h3 className="font-bold">Autorizaciones y firmas del cliente</h3>
    {puedeEmitir && <GestionRespuestaCliente asesoria={actual} onGestion={refrescar} />}
    {puedeEmitir && enRevision && <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-sm">Corrige la cotización y luego envía una nueva versión para firma.</p><button disabled={ocupado} onClick={() => setEditarCotizacion(true)} className="mt-2 rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Editar cotización para revisión</button></div>}
    {editarCotizacion && createPortal(<AsesoriaFormModal asesoria={actual} onClose={() => setEditarCotizacion(false)} onSaved={refrescar} />, document.body)}
    <p className="mt-2 text-xs text-slate-500">Cotizacion, diagnostico y entrega se firman por separado. Un cambio en el contenido exige una nueva autorizacion. Los enlaces solo se envian al correo registrado del cliente.</p>
    {!actual.autorizaciones?.requeridas && <p className="mt-2 text-xs text-amber-700">Servicio anterior al nuevo flujo. La emision de una cotizacion activa las firmas obligatorias.</p>}
    <p className="mt-2 text-xs">Etapa actual: {(actual.flujo?.etapa || "").replaceAll("_", " ")}</p>
    <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
      {Object.entries(documentosFirma).map(([tipo, etiqueta]) => {
        const ultimo = actual.autorizaciones?.documentos?.findLast((documento) => documento.tipo === tipo);
        const firmado = ultimo?.estado === "FIRMADO" && ultimo.contenidoVigente !== false;
        const nombre = tipo === "COTIZACION" && actual.garantia?.esGarantia ? "Solicitud de garantía" : etiqueta;
        if (firmado) {
          return <span key={tipo} className="rounded bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{nombre} · Firma registrada</span>;
        }
        if (!puedeEmitir) return null;
        const entregaPendiente = tipo === "ENTREGA" && (actual.flujo?.etapa !== "PENDIENTE_PAGO"
          || (actual.coordinacion?.calidad?.requerida && actual.coordinacion.calidad.estado !== "APROBADA"));
        const deshabilitado = ocupado || actual.estado === "CANCELADA" || actual.autorizaciones?.bloqueoCliente
          || entregaPendiente || procesandoFotos || !!diagnostico || (tipo === "DIAGNOSTICO" && (actual.recepcion?.fotos?.length || 0) < 4);
        return <div key={tipo}>
          <button disabled={deshabilitado} onClick={() => emitir(tipo)} className="rounded bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            Enviar {nombre.toLowerCase()} para firma
          </button>
          {entregaPendiente && <p className="mt-1 text-xs text-slate-500">Disponible cuando el vehículo esté listo para entrega.</p>}
        </div>;
      })}
    </div>
    {puedeEmitir && !actual.autorizaciones?.bloqueoCliente && actual.estado !== "CANCELADA" && actual.flujo?.etapa === "PENDIENTE_FIRMA_DIAGNOSTICO" && !diagnostico && (
      <div className="mt-3">
        {corregirDiagnostico && <p className="mb-2 text-sm text-slate-600">Corrige las observaciones o retira y reemplaza fotos. Guarda los cambios y envía el diagnóstico corregido para firma.</p>}
        <button onClick={abrirDiagnostico} disabled={ocupado || procesandoFotos} className="rounded border border-blue-300 px-3 py-2 text-sm text-blue-800">
          {corregirDiagnostico ? "Corregir diagnóstico y fotos" : "Registrar o revisar diagnóstico"}
        </button>
      </div>
    )}
    {diagnostico && <form onSubmit={guardarDiagnostico} className="mt-3 space-y-3 rounded border bg-slate-50 p-3">
      <h4 className="font-bold">Diagnostico de ingreso</h4>
      <label className="flex gap-2"><input type="checkbox" checked={diagnostico.tieneRayones} onChange={(e) => cambiarDiagnostico("tieneRayones", e.target.checked)} />Se encontraron rayones</label>
      {diagnostico.tieneRayones && <textarea required maxLength={4000} placeholder="Describa los rayones" value={diagnostico.detalleRayones} onChange={(e) => cambiarDiagnostico("detalleRayones", e.target.value)} className="w-full rounded border p-2" />}
      <label className="flex gap-2"><input type="checkbox" checked={diagnostico.dejaObjetos} onChange={(e) => cambiarDiagnostico("dejaObjetos", e.target.checked)} />El cliente deja objetos dentro</label>
      {diagnostico.dejaObjetos && <textarea required maxLength={4000} placeholder="Relacione cada objeto y su ubicacion" value={diagnostico.detalleObjetos} onChange={(e) => cambiarDiagnostico("detalleObjetos", e.target.value)} className="w-full rounded border p-2" />}
      <label className="block">Estado general y observaciones<textarea maxLength={4000} value={diagnostico.observaciones} onChange={(e) => cambiarDiagnostico("observaciones", e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <label className="block">Seguro todo riesgo declarado<select value={diagnostico.seguroEstado} onChange={(e) => cambiarDiagnostico("seguroEstado", e.target.value)} className="ml-2 rounded border p-2"><option value="SIN_CONFIRMAR">Sin confirmar</option><option value="SI">Si</option><option value="NO">No</option></select></label>
      <FotosDiagnostico fotos={diagnostico.fotos} onChange={(fotos) => cambiarDiagnostico("fotos", fotos)} disabled={ocupado} procesando={procesandoFotos} onProcesando={setProcesandoFotos} />
      <button disabled={ocupado || procesandoFotos || diagnostico.fotos.length < 4 || diagnostico.fotos.length > 10} className="rounded bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-40">Guardar diagnóstico y fotografías</button><button type="button" disabled={ocupado || procesandoFotos} onClick={() => setDiagnostico(null)} className="ml-2 rounded border px-3 py-2">Cancelar</button>
    </form>}
    {actual.flujo?.etapa === "PENDIENTE_FIRMA_DIAGNOSTICO" && (actual.recepcion?.fotos?.length || 0) < 4 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Antes de enviar el diagnóstico, registra entre 4 y 10 fotos del vehículo.</p>}
    {mensaje && <p role="status" className="mt-3 rounded bg-slate-100 p-3 text-sm">{mensaje}</p>}
    <div className="mt-3 space-y-2">{[...(actual.autorizaciones?.documentos || [])].reverse().map((d) => <div key={d._id} className="rounded border p-3 text-xs"><strong>{d.tipo}</strong> · {d.estado}{d.contenidoVigente === false ? " · VERSION ANTERIOR (no autoriza el contenido actual)" : ""} · Correo: {d.envio}<br />Emitido: {new Date(d.creadoEn).toLocaleString("es-CO", { timeZone: "America/Bogota" })}{d.firma?.fecha && <p>Firmado: {new Date(d.firma.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota" })} · {d.firma.nombre}</p>}{d.respuestaCliente?.fecha && <div className="mt-2 rounded bg-amber-50 p-3"><strong>{d.estado === "RECHAZADO" ? "Rechazo" : "Solicitud de corrección"}</strong><p className="whitespace-pre-wrap break-words">{d.respuestaCliente.motivo}</p><p>{d.respuestaCliente.nombre} · {new Date(d.respuestaCliente.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p>{d.gestionRespuesta?.fecha && <p className="mt-2 whitespace-pre-wrap">Gestión: {d.gestionRespuesta.nota} · {d.gestionRespuesta.usuarioNombre} · {new Date(d.gestionRespuesta.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p>}</div>}<button disabled={ocupado} onClick={() => abrirDocumento(d)} className="mt-2 font-semibold text-blue-700">Ver documento y evidencia</button></div>)}</div>
    {vista && <div className="mt-4 border-t pt-4"><DocumentoServicio documento={vista} /></div>}
  </section>;
}
