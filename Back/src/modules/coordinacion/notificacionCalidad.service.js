import { enviarCorreoBrevo } from "../../utils/correoBrevo.js";
import Asesoria from "../asesores/asesoria.model.js";
import Alerta from "../alertas/alerta.model.js";

const escapar = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const crearCorreoVehiculoListo = (orden) => {
  const texto = `Hola, ${orden.cliente.nombre}.\n\nEl vehículo de placa ${orden.vehiculo.placa}, servicio ${orden.codigo}, terminó su revisión de calidad y está listo para coordinar la entrega. Comunícate con tu asesor para acordar la recogida y completar los documentos y pagos que correspondan.\n\nPolarizados Ya`;
  return { subject: `Polarizados Ya | Tu vehículo está listo | ${orden.vehiculo.placa}`,
    text: texto, html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#334155"><h2 style="background:#0f172a;color:white;padding:24px">POLARIZADOS YA</h2><h1 style="color:#0f172a">Tu vehículo está listo</h1><p>Hola, ${escapar(orden.cliente.nombre)}.</p><p>El vehículo <strong>${escapar(orden.vehiculo.placa)}</strong>, servicio ${escapar(orden.codigo)}, terminó su revisión de calidad.</p><p>Comunícate con tu asesor para coordinar la entrega y completar los documentos y pagos que correspondan.</p><p style="padding:16px;background:#eff6ff">Gracias por confiar en Polarizados Ya.</p></div>` };
};

export const avisarVehiculoListo = async (id) => {
  const orden = await Asesoria.findById(id);
  const calidad = orden?.coordinacion?.calidad;
  if (!orden || calidad?.estado !== "APROBADA" || !["PENDIENTE_PAGO", "FINALIZADA"].includes(orden.flujo?.etapa)) throw new Error("Primero debe aprobarse calidad y finalizar el trabajo");
  const revision = calidad.revisiones.at(-1);
  await Alerta.findOneAndUpdate({ clave: `vehiculo-listo:${orden._id}:${revision._id}` }, {
    tipo: "VEHICULO_LISTO_ASESOR", mensaje: `${orden.codigo}: calidad aprobada. El vehículo ${orden.vehiculo.placa} está listo para coordinar entrega.`,
    destinatarioId: orden.creadoPor, referenciaId: orden._id, accionUrl: `/asesores?asesoria=${orden._id}`, activa: true,
  }, { upsert: true, new: true, setDefaultsOnInsert: true });
  if (calidad.aviso.estado === "ENVIADO") return { enviado: true };
  const ahora = new Date();
  const tomada = await Asesoria.findOneAndUpdate({ _id: id, "coordinacion.calidad.estado": "APROBADA", $or: [
    { "coordinacion.calidad.aviso.estado": { $in: ["PENDIENTE", "ERROR"] } },
    { "coordinacion.calidad.aviso.estado": "ENVIANDO", "coordinacion.calidad.aviso.intentoEn": { $lt: new Date(ahora.getTime() - 120000) } },
  ] }, { $set: { "coordinacion.calidad.aviso.estado": "ENVIANDO", "coordinacion.calidad.aviso.intentoEn": ahora } }, { new: true });
  if (!tomada) return { enviado: false, mensaje: "El aviso ya fue enviado o esta siendo procesado. Actualice el estado." };
  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orden.cliente.correo)) throw new Error("El cliente no tiene un correo valido");
    const proveedorId = await enviarCorreoBrevo({ correo: orden.cliente.correo,
      claveEnvio: `vehiculo-listo-${orden._id}-${revision._id}-${orden.cliente.correo}`, ...crearCorreoVehiculoListo(orden) });
    await Asesoria.updateOne({ _id: id }, { $set: { "coordinacion.calidad.aviso.estado": "ENVIADO", "coordinacion.calidad.aviso.enviadoEn": new Date(), "coordinacion.calidad.aviso.proveedorId": proveedorId, "coordinacion.calidad.aviso.error": "" } });
    return { enviado: true };
  } catch (error) {
    const mensaje = error.name === "TimeoutError" ? "El proveedor tardo demasiado. Reintente el aviso." : error.message;
    await Asesoria.updateOne({ _id: id }, { $set: { "coordinacion.calidad.aviso.estado": "ERROR", "coordinacion.calidad.aviso.error": mensaje.slice(0, 500) } });
    return { enviado: false, mensaje };
  }
};
