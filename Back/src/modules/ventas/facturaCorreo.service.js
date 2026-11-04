import { enviarCorreoBrevo } from "../../utils/correoBrevo.js";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import Venta from "./venta.model.js";
import Asesoria from "../asesores/asesoria.model.js";
import { generarComprobantePdf } from "./comprobanteVenta.js";

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

  const actual = await Venta.findById(id).lean();
  if (!actual || actual.estado !== "PAGADA" || Number(actual.saldoPendiente || 0) > 0 || actual.cliente.correo !== correo) {
    throw new Error("La venta o el correo cambiaron. Vuelva a confirmar el envío");
  }
  const pdf = generarComprobantePdf(actual);
  const clave = createHash("sha256").update(pdf).digest("hex");
  if (actual.auditoria?.some((a) => a.accion === "COMPROBANTE_ENVIADO" && a.descripcion === clave)) {
    return { correo, enviado: true, yaEnviado: true };
  }
  try {
    await enviarCorreoBrevo({ correo, claveEnvio: `comprobante-${id}-${clave}`,
      subject: `Polarizados Ya | Comprobante de venta ${actual.codigoVenta}`,
      text: `Hola, ${actual.cliente.nombre}.\n\nAdjuntamos el comprobante de tu venta ${actual.codigoVenta}.\n\nGracias por confiar en Polarizados Ya.`,
      attachments: [{ filename: `Comprobante-${actual.codigoVenta.replace(/[^a-z0-9-]/gi, "-")}.pdf`, content: pdf.toString("base64") }],
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
