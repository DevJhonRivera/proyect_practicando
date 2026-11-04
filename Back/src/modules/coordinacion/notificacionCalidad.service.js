import { enviarCorreoBrevo } from "../../utils/correoBrevo.js";
import Asesoria from "../asesores/asesoria.model.js";
import Alerta from "../alertas/alerta.model.js";

const escapar = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const crearCorreoVehiculoListo = (orden) => {
  const { codigo, cliente: { nombre }, vehiculo: { placa } } = orden;
  const entrega = "Comunícate con tu asesor para acordar la recogida y completar los documentos o pagos que correspondan.";
  const despedida = "Gracias por confiar en nosotros. ¡Que disfrutes cada kilómetro!";
  const servicios = "También puedes preguntarle a tu asesor por nuestras opciones de polarizado y película de protección de pintura (PPF).";
  return {
    subject: `Polarizados Ya | Tu vehículo está listo | ${placa}`,
    text: `Hola, ${nombre}.\n\nTu vehículo pasó el control de calidad y está listo para coordinar la entrega.\nPlaca: ${placa}\nServicio: ${codigo}\n\n${entrega}\n\n${despedida}\n${servicios}\n\nPolarizados Ya`,
    html: `
      <div lang="es" style="margin:0;background:#f1f5f9;padding:24px 12px;font-family:Arial,sans-serif;color:#334155">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">
          <tr><td style="padding:28px;background:#0f172a;color:#ffffff;border-radius:15px 15px 0 0">
            <p style="margin:0 0 12px;color:#bfdbfe;font-size:13px;font-weight:bold;letter-spacing:2px">POLARIZADOS YA</p>
            <h1 style="margin:0;font-size:30px;line-height:1.2">Tu vehículo está listo</h1>
          </td></tr>
          <tr><td style="padding:28px;font-size:16px;line-height:1.6">
            <p style="margin:0 0 12px">Hola, <strong>${escapar(nombre)}</strong>.</p>
            <p style="margin:0 0 20px">Tu vehículo pasó el control de calidad y está listo para coordinar la entrega.</p>
            <div style="padding:14px 18px;background:#eff6ff;border-left:4px solid #2563eb">
              <strong>Placa</strong> · ${escapar(placa)}<br>
              <strong>Servicio</strong> · ${escapar(codigo)}
            </div>
            <h2 style="margin:24px 0 4px;color:#0f172a;font-size:18px">Coordina tu recogida</h2>
            <p style="margin:0">${entrega}</p>
          </td></tr>
          <tr><td style="padding:20px 28px;background:#f8fafc;border-radius:0 0 15px 15px">
            <p style="margin:0 0 6px;color:#0f172a;font-weight:bold">${despedida}</p>
            <p style="margin:0;font-size:14px;line-height:1.5">${servicios}</p>
          </td></tr>
        </table>
      </div>`,
  };
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
