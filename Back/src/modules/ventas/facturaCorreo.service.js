import { enviarCorreoBrevo } from "../../utils/correoBrevo.js";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import Venta from "./venta.model.js";
import Asesoria from "../asesores/asesoria.model.js";
import { crearHtmlComprobante } from "./comprobantePlantilla.js";
import { crearEnlaceComprobante } from "./comprobanteAcceso.js";

const escapar = (value) => String(value ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export async function gestionarCorreoFactura(id, { correo: entrada, enviar } = {}, user) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Venta no válida");
  const correo = typeof entrada === "string" ? entrada.trim().toLowerCase() : "";
  if (correo.length > 254 || !/^[^\s@<>(),;:"\\]+@[^\s@<>(),;:"\\]+\.[^\s@<>(),;:"\\]+$/.test(correo)) {
    throw new Error("Ingrese un correo válido");
  }
  const venta = await Venta.findById(id).lean();
  if (!venta || venta.estado !== "PAGADA" || Number(venta.saldoPendiente || 0) > 0) {
    throw new Error("El comprobante solo se puede enviar cuando la venta está pagada");
  }

  const auditoria = (accion, descripcion) => ({
    accion, descripcion, usuarioId: user._id, usuarioNombre: user.nombre || user.rol, usuarioRol: user.rol,
  });
  if (venta.cliente.correo !== correo) {
    const resultado = await Venta.updateOne(
      { _id: id, estado: "PAGADA", updatedAt: venta.updatedAt },
      { $set: { "cliente.correo": correo }, $push: { auditoria: auditoria("CORREO_FACTURACION_ACTUALIZADO", "Correo del cliente actualizado en Caja") } },
      { runValidators: true },
    );
    if (!resultado.matchedCount) throw new Error("La venta cambió. Actualice el historial e inténtelo otra vez");
  }
  if (venta.asesoriaId) {
    const orden = await Asesoria.findById(venta.asesoriaId).select("cliente flujo").lean();
    if (orden && orden.cliente.cedula === venta.cliente.cedula && orden.flujo.etapa === "FINALIZADA" && orden.cliente.correo !== correo) {
      const resultado = await Asesoria.updateOne(
        { _id: orden._id, "flujo.etapa": "FINALIZADA", "cliente.correo": orden.cliente.correo },
        { $set: { "cliente.correo": correo, correoActualizadoEnCaja: correo },
          $push: { auditoria: auditoria("CORREO_FACTURACION_ACTUALIZADO", "Correo del cliente actualizado en Caja") } },
        { runValidators: true },
      );
      if (!resultado.matchedCount) throw new Error("El correo se guardó en la venta, pero la orden cambió. Vuelva a confirmar para actualizarla antes de enviar");
    }
  }
  if (enviar !== true) return { correo, enviado: false };

  const actual = await Venta.findById(id).populate("asesoriaId", "cliente vehiculo").lean();
  if (!actual || actual.estado !== "PAGADA" || Number(actual.saldoPendiente || 0) > 0 || actual.cliente.correo !== correo) {
    throw new Error("La venta o el correo cambiaron. Vuelva a confirmar el envío");
  }
  let clave;
  try {
    const enlace = crearEnlaceComprobante(id, correo);
    clave = createHash("sha256").update(enlace).update(crearHtmlComprobante(actual)).digest("hex");
    if (actual.auditoria?.some((a) => a.accion === "COMPROBANTE_ENVIADO" && a.descripcion === clave)) {
      return { correo, enviado: true, yaEnviado: true };
    }
    await enviarCorreoBrevo({ correo, claveEnvio: `comprobante-${id}-${clave}`,
      subject: `Polarizados Ya | Comprobante de venta ${actual.codigoVenta}`,
      text: `Hola, ${actual.cliente.nombre}.\n\nTu pago quedó registrado. Abre el comprobante de venta ${actual.codigoVenta} para imprimirlo o guardarlo como PDF.\n\n${enlace}\n\nGracias por confiar en Polarizados Ya. ¡Que disfrutes cada kilómetro!`,
      html: `<div lang="es" style="background:#f1f5f9;padding:24px 12px;font-family:Arial,sans-serif;color:#334155">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px">
          <tr><td style="padding:28px;background:#0f172a;color:#fff;border-radius:15px 15px 0 0">
            <p style="margin:0 0 10px;color:#bfdbfe;font-size:13px;font-weight:bold;letter-spacing:2px">POLARIZADOS YA</p>
            <h1 style="margin:0;font-size:28px">Tu comprobante de venta</h1>
          </td></tr>
          <tr><td style="padding:28px;font-size:16px;line-height:1.6">
            <p style="margin:0 0 12px">Hola, <strong>${escapar(actual.cliente.nombre)}</strong>.</p>
            <p style="margin:0 0 18px">Tu pago quedó registrado. Abre tu comprobante para imprimirlo o guardarlo como PDF.</p>
            <div style="padding:14px 18px;background:#eff6ff;border-left:4px solid #2563eb"><strong>Venta</strong> · ${escapar(actual.codigoVenta)}</div>
            <p style="margin:22px 0 0"><a href="${escapar(enlace)}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;font-weight:bold;text-decoration:none">Ver comprobante</a></p>
          </td></tr>
          <tr><td style="padding:20px 28px;background:#f8fafc;color:#0f172a;border-radius:0 0 15px 15px">Gracias por confiar en Polarizados Ya. <strong>¡Que disfrutes cada kilómetro!</strong></td></tr>
        </table>
      </div>`,
    });
  } catch (error) {
    throw new Error(`Correo guardado. ${error.message}`, { cause: error });
  }
  await Venta.updateOne(
    { _id: id, auditoria: { $not: { $elemMatch: { accion: "COMPROBANTE_ENVIADO", descripcion: clave } } } },
    { $push: { auditoria: auditoria("COMPROBANTE_ENVIADO", clave) } },
  );
  return { correo, enviado: true };
}
