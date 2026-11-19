import { hash, coincideHuellaDocumento } from "./autorizaciones.utils.js";

export const validarRespuestaCliente = (body, orden, documento) => {
  if (!["COTIZACION", "DIAGNOSTICO"].includes(documento.tipo)) throw new Error("Esta opcion solo aplica a cotizacion y diagnostico");
  if (documento.estado !== "PENDIENTE" || orden.estado === "CANCELADA" || orden.autorizaciones?.bloqueoCliente) throw new Error("Este documento ya no admite respuestas");
  const etapa = documento.tipo === "COTIZACION" ? "PENDIENTE_FIRMA_COTIZACION" : "PENDIENTE_FIRMA_DIAGNOSTICO";
  if (orden.flujo?.etapa !== etapa) throw new Error("El servicio cambio de etapa; contacte al asesor");
  if (!["RECHAZAR", "SOLICITAR_CORRECCION"].includes(body.accion)) throw new Error("Respuesta no valida");
  if (body.huella !== documento.huella || hash(documento.contenido) !== documento.huella || !coincideHuellaDocumento(orden, documento)) throw new Error("El documento cambio. Solicite la version actualizada");
  if (documento.tipo !== "COTIZACION" || body.accion !== "SOLICITAR_CORRECCION") {
    if (typeof body.nombre !== "string" || body.nombre.trim().length < 3 || body.nombre.length > 150) throw new Error("Indique su nombre completo");
    if (typeof body.cedula !== "string" || !/^\d+$/.test(body.cedula) || body.cedula !== orden.cliente.cedula) throw new Error("El documento no coincide con el titular del servicio");
  }
  if (typeof body.motivo !== "string" || body.motivo.trim().length < 5 || body.motivo.length > 2000) throw new Error("Indique un motivo de entre 5 y 2000 caracteres");
};
