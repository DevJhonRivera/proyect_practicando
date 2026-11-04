import { createHmac, timingSafeEqual } from "node:crypto";

export function firmarAccesoComprobante(id, correo) {
  return createHmac("sha256", process.env.JWT_SECRET)
    .update(JSON.stringify(["comprobante-venta-v1", String(id), correo]))
    .digest("hex");
}

export function validarAccesoComprobante(venta, token) {
  if (venta?.estado !== "PAGADA" || Number(venta.saldoPendiente || 0) > 0 ||
      !venta.cliente?.correo || typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return false;
  }
  return timingSafeEqual(
    Buffer.from(token, "hex"),
    Buffer.from(firmarAccesoComprobante(venta._id, venta.cliente.correo), "hex"),
  );
}

export function crearEnlaceComprobante(id, correo) {
  const base = process.env.BACKEND_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL ||
    (process.env.NODE_ENV !== "production" ? `http://localhost:${process.env.PORT || 5001}` : "");
  if (!base) throw new Error("Configure BACKEND_PUBLIC_URL para enviar el comprobante");
  const enlace = new URL(`/api/ventas/${id}/comprobante-cliente`, base);
  enlace.searchParams.set("acceso", firmarAccesoComprobante(id, correo));
  return enlace.href;
}
