import { createHash } from "node:crypto";

export function configurarCorreoBrevo() {
  const clave = process.env.BREVO_API_KEY?.trim();
  const email = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!clave || !email) throw new Error("Configure BREVO_API_KEY y BREVO_SENDER_EMAIL en el backend");
  return { clave, remitente: { email, name: "Polarizados Ya" } };
}

export async function enviarCorreoBrevo({ correo, subject, html, text, attachments, claveEnvio }) {
  const { clave, remitente } = configurarCorreoBrevo();
  const replyTo = process.env.BREVO_REPLY_TO?.trim();
  const mensaje = {
    sender: remitente,
    to: [{ email: correo }],
    subject,
    htmlContent: html,
    textContent: text,
    ...(replyTo && { replyTo: { email: replyTo } }),
    ...(attachments?.length && { attachment: attachments.map(({ filename, content }) => ({ name: filename, content })) }),
  };
  if (claveEnvio) {
    const hash = createHash("sha256").update(claveEnvio).digest("hex");
    const idempotencyKey = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    mensaje.headers = { idempotencyKey };
  }
  const respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: { "api-key": clave, "Content-Type": "application/json" },
    body: JSON.stringify(mensaje),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.json?.().catch(() => null);
    if (claveEnvio && detalle?.code === "duplicate_parameter" && /idempotency/i.test(detalle.message || "")) return "";
    const motivo = respuesta.status === 401 ? "Revise BREVO_API_KEY"
      : respuesta.status === 429 ? "Revise la cuota y espere antes de reintentar"
        : "Revise el remitente verificado, el destinatario y el estado de los envíos transaccionales en Brevo";
    throw new Error(`Brevo no aceptó el correo (HTTP ${respuesta.status || "desconocido"}). ${motivo}.`);
  }
  const recibo = await respuesta.json?.();
  return recibo?.messageId || "";
}
