import { useRef, useState } from "react";
import axios from "axios";
import { ImagePlus } from "lucide-react";
import api from "../../api/axios";
import DocumentoServicio from "./DocumentoServicio";
import { optimizarFoto } from "../../utils/optimizarFoto";

export default function FirmaClientePage() {
  const [token] = useState(() => window.location.hash.slice(1));
  const [documento, setDocumento] = useState(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [accionRespuesta, setAccionRespuesta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacionEntrega, setObservacionEntrega] = useState("");
  const [evidenciaEntrega, setEvidenciaEntrega] = useState("");
  const [procesandoEvidencia, setProcesandoEvidencia] = useState(false);
  const [aceptaciones, setAceptaciones] = useState({ documento: false, datos: false, condiciones: false, firmaElectronica: false });
  const canvas = useRef(null);
  const puntos = useRef([]);
  const dibujando = useRef(false);
  const llamar = async (accion, datos) => (await axios.post(`${api.defaults.baseURL}/autorizaciones/${accion}`, datos)).data.data;
  const cargar = async () => {
    setOcupado(true); setError("");
    try { setDocumento(await llamar("consultar", { token })); }
    catch (e) { setError(e.response?.data?.message || "No se pudo consultar el documento"); }
    finally { setOcupado(false); }
  };
  const punto = (evento, inicio) => {
    const rect = canvas.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (evento.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (evento.clientY - rect.top) / rect.height));
    if (puntos.current.length >= 5000) return;
    const previo = puntos.current.at(-1);
    puntos.current.push([x, y, inicio]);
    if (inicio || !previo) return;
    const ctx = canvas.current.getContext("2d");
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(previo[0] * 720, previo[1] * 220); ctx.lineTo(x * 720, y * 220); ctx.stroke();
  };
  const limpiar = () => { puntos.current = []; canvas.current.getContext("2d").clearRect(0, 0, 720, 220); };
  const adjuntarEvidencia = async (evento) => {
    const archivo = evento.target.files[0];
    evento.target.value = "";
    if (!archivo) return;
    setProcesandoEvidencia(true);
    setError("");
    try { setEvidenciaEntrega(await optimizarFoto(archivo)); }
    catch (e) { setError(e.message || "No se pudo preparar la imagen"); }
    finally { setProcesandoEvidencia(false); }
  };
  const firmar = async (evento) => {
    evento.preventDefault();
    if (ocupado || procesandoEvidencia) return;
    setOcupado(true); setError("");
    const reserva = documento.tipo === "ENTREGA" ? { observacionEntrega, evidenciaEntrega } : {};
    try { setDocumento(await llamar("firmar", { token, nombre, cedula, aceptaciones, trazo: puntos.current, huella: documento.huella, ...reserva })); }
    catch (e) { setError(e.response?.data?.message || "No se pudo registrar la firma"); }
    finally { setOcupado(false); }
  };
  const contenido = documento?.contenido;
  const responder = async (evento) => {
    evento.preventDefault(); setOcupado(true); setError("");
    try { setDocumento(await llamar("responder", { token, nombre, cedula, motivo, accion: accionRespuesta, huella: documento.huella })); setAccionRespuesta(""); }
    catch (e) { setError(e.response?.data?.message || "No se pudo registrar la respuesta"); }
    finally { setOcupado(false); }
  };
  const requeridas = contenido?.aceptacionesRequeridas || ["documento", "datos", "condiciones", "firmaElectronica"];
  const garantia = contenido?.datos?.garantia?.esGarantia;
  const textos = {
    documento: documento?.tipo === "DIAGNOSTICO" ? ["Confirmo el diagnóstico", "Revisé las fotos, el estado del vehículo y las pertenencias registradas."] : documento?.tipo === "ENTREGA" ? ["Confirmo la recepción del vehículo", "Revisé el acta de entrega. Conservo mis garantías y derechos legales."] : ["Apruebo el servicio y su precio", "Acepto los materiales, el alcance y el valor que aparecen en esta cotización."],
    datos: ["Autorizo el uso de mis datos", "Para este servicio, sus fotografías, entrega y garantías, según la autorización y la política disponibles. No incluye publicidad."],
    condiciones: ["Acepto las condiciones del servicio", "Revisé el resumen y las condiciones disponibles. Se conservan mis derechos y las responsabilidades legales de la empresa."],
    firmaElectronica: ["Confirmo mi firma electrónica", "Soy el titular y mi firma expresa la aprobación de este documento mediante el mecanismo descrito."],
  };
  if (garantia && documento.tipo === "COTIZACION") textos.documento = ["Solicito la atenci\u00f3n por garant\u00eda y autorizo la atenci\u00f3n descrita", "Confirmo el motivo del reclamo. Autorizo la revisi\u00f3n y, si se aprueba la garant\u00eda, los trabajos descritos. La procedencia ser\u00e1 evaluada por Administraci\u00f3n; esta firma no autoriza cobros adicionales."];
  return <main className="min-h-screen bg-slate-100 px-3 py-6 sm:px-6 print:bg-white print:p-0"><div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 print:rounded-none print:border-0 print:shadow-none"><header className="flex items-center justify-between gap-4 bg-slate-950 px-5 py-6 text-white sm:px-9 print:hidden"><div><p className="text-lg font-black tracking-wider">POLARIZADOS <span className="text-blue-400">YA</span></p><p className="mt-1 text-xs text-slate-400">Tu vehículo. Cada detalle, documentado.</p></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">Portal de aprobación</span></header><div className="p-5 sm:p-9">
    {!documento && <section><h1 className="text-xl font-bold">Documento para firma · Polarizados Ya</h1><p className="my-4">Abra el documento enviado a su correo. Revise el servicio y las condiciones antes de firmar.</p><button onClick={cargar} disabled={ocupado || !token} className="rounded bg-blue-700 px-4 py-3 text-white disabled:opacity-50">{ocupado ? "Consultando..." : "Ver mi documento"}</button>{!token && <p className="mt-3 text-red-700">Abra el enlace completo enviado a su correo.</p>}</section>}
    {documento && <><DocumentoServicio documento={documento} /><button onClick={() => window.print()} className="my-4 rounded border px-4 py-2 print:hidden">Imprimir / guardar PDF</button>
      {documento.estado === "PENDIENTE" && ["COTIZACION", "DIAGNOSTICO"].includes(documento.tipo) && <section className="my-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 print:hidden">
        <h2 className="font-bold text-slate-900">¿Necesitas un cambio o no deseas continuar?</h2>
        <p className="mt-2 text-sm text-slate-600">Puedes responder antes de aprobar. El servicio permanecerá bloqueado y el asesor revisará tu motivo.</p>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={ocupado} onClick={() => { setAccionRespuesta("SOLICITAR_CORRECCION"); setError(""); }} className="rounded-xl border border-blue-300 bg-white px-4 py-3 font-semibold text-blue-800">Solicitar corrección</button><button type="button" disabled={ocupado} onClick={() => { setAccionRespuesta("RECHAZAR"); setError(""); }} className="rounded-xl border border-red-200 bg-white px-4 py-3 font-semibold text-red-700">Rechazar documento</button></div>
        {accionRespuesta && <form onSubmit={responder} className="mt-5 space-y-4 border-t pt-4"><fieldset disabled={ocupado} className="space-y-4">
          <h3 className="font-bold">{accionRespuesta === "RECHAZAR" ? "Confirmar rechazo" : "Solicitar una corrección"}</h3>
          <label className="block text-sm font-semibold">Nombre completo<input required minLength={3} maxLength={150} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label>
          <label className="block text-sm font-semibold">Documento de identidad<input required inputMode="numeric" maxLength={15} value={cedula} onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))} className="mt-2 w-full rounded-xl border p-3" /></label>
          <label className="block text-sm font-semibold">{accionRespuesta === "RECHAZAR" ? "¿Por qué no aceptas este documento?" : "¿Qué debemos corregir?"}<textarea required minLength={5} maxLength={2000} rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label>
          <p className="text-sm text-slate-600">Esta respuesta no aprueba el documento. Guardaremos tu motivo, identidad declarada, fecha, hora y datos técnicos como evidencia. Para aprobar después, el asesor debe enviar una nueva versión.</p>
          <div className="flex flex-wrap gap-3"><button disabled={ocupado} className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">{ocupado ? "Registrando..." : accionRespuesta === "RECHAZAR" ? "Confirmar rechazo del documento" : "Enviar solicitud de corrección"}</button><button type="button" onClick={() => setAccionRespuesta("")} className="rounded-xl border px-4 py-3">Volver a la aprobación</button></div>
        </fieldset></form>}
      </section>}
      {documento.estado === "PENDIENTE" && !accionRespuesta && <form onSubmit={firmar} className="space-y-4 border-t pt-4 print:hidden">
        <div className="mb-5"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Tu aprobación</p><h2 className="mt-1 text-xl font-bold text-slate-950">Revisa, confirma y firma</h2><p className="mt-2 text-sm text-slate-500">Marca cada confirmación. Si encuentras una diferencia, solicita su corrección antes de firmar.</p></div>
        <fieldset disabled={ocupado} className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Nombre completo del titular<input required autoComplete="name" maxLength={150} value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label><label className="block text-sm font-semibold text-slate-700">Documento de identidad<input required inputMode="numeric" maxLength={15} value={cedula} onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label></fieldset>
        <fieldset disabled={ocupado} className="space-y-3">{requeridas.map((key) => <label key={key} className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition sm:p-5 ${aceptaciones[key] ? "border-blue-500 bg-blue-50 ring-1 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-300"}`}><input type="checkbox" required checked={aceptaciones[key]} onChange={(e) => setAceptaciones((a) => ({ ...a, [key]: e.target.checked }))} className="mt-1 h-5 w-5 shrink-0 accent-blue-700" /><span><span className="block text-sm font-bold text-slate-900">{textos[key]?.[0] || key}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{textos[key]?.[1]}</span></span></label>)}</fieldset>
        {documento.tipo === "ENTREGA" && <fieldset disabled={ocupado || procesandoEvidencia} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <legend className="px-2 font-bold">Observaciones al recibir el vehículo</legend>
          <p className="text-sm">Si encuentras un daño o defecto, puedes firmar la recepción dejando constancia aquí.</p>
          <label className="block text-sm font-semibold">Comentario (opcional)
            <textarea maxLength={2000} rows={3} value={observacionEntrega} onChange={(e) => setObservacionEntrega(e.target.value)} className="mt-1 block w-full rounded border bg-white p-2" />
          </label>
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 has-disabled:cursor-wait has-disabled:opacity-60">
              <ImagePlus size={20} aria-hidden="true" />
              {evidenciaEntrega ? "Cambiar foto o comprobante" : "Adjuntar foto o comprobante"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={adjuntarEvidencia} aria-describedby="formatos-evidencia-entrega" className="sr-only" />
            </label>
            <p id="formatos-evidencia-entrega" className="mt-2 text-xs text-slate-600">Opcional. Selecciona una imagen JPG, PNG o WebP.</p>
          </div>
          {procesandoEvidencia && <p role="status">Preparando imagen…</p>}
          {evidenciaEntrega && <div className="space-y-2">
            <img src={evidenciaEntrega} alt="Vista previa de la evidencia" className="max-h-40 rounded border" />
            <button type="button" onClick={() => setEvidenciaEntrega("")} className="rounded border bg-white px-3 py-2">Quitar imagen</button>
          </div>}
        </fieldset>}
        <div><p className="mb-2 font-semibold">Dibuje su firma con el dedo o el mouse</p><canvas ref={canvas} width={720} height={220} className="w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50" aria-label="Recuadro para dibujar su firma" onPointerDown={(e) => { dibujando.current = true; e.currentTarget.setPointerCapture(e.pointerId); punto(e, 1); }} onPointerMove={(e) => { if (dibujando.current) punto(e, 0); }} onPointerUp={() => { dibujando.current = false; }} onPointerCancel={() => { dibujando.current = false; }} /><button type="button" onClick={limpiar} className="mt-2 rounded border px-3 py-2">Borrar firma</button></div>
        <p className="text-xs text-slate-500">Guardaremos este documento, tu firma, fecha, hora, IP y datos del navegador como evidencia de la aprobación.</p>
        <button disabled={ocupado || procesandoEvidencia} className="w-full rounded-xl bg-blue-700 px-5 py-4 font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-800 disabled:opacity-50">{ocupado ? "Registrando..." : documento.tipo === "ENTREGA" ? "Firmar recepción del vehículo" : "Firmar y aprobar documento"}</button>
      </form>}
      {documento.estado === "FIRMADO" && <p role="status" className="my-3 rounded bg-emerald-50 p-3 text-emerald-800 print:hidden">Firma registrada. Puede guardar su comprobante en PDF con el boton de imprimir.</p>}
      {documento.respuestaCliente && <section role="status" className="my-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><h2 className="font-bold">{documento.estado === "RECHAZADO" ? "Rechazo registrado" : "Solicitud de corrección registrada"}</h2><p className="mt-2 whitespace-pre-wrap break-words">{documento.respuestaCliente.motivo}</p><p className="mt-3 text-xs">{documento.respuestaCliente.nombre} · {new Date(documento.respuestaCliente.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p><p className="mt-3 text-sm">Este documento no autoriza el servicio. El asesor debe gestionar tu respuesta antes de continuar. Puedes guardar el comprobante en PDF.</p></section>}
    </>}
    {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800 print:hidden">{error}</p>}
  </div></div></main>;
}
