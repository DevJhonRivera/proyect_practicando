import test from "node:test";
import assert from "node:assert/strict";
import Venta from "../src/modules/ventas/venta.model.js";
import Asesoria from "../src/modules/asesores/asesoria.model.js";
import { datosDocumento, huellaDatos, coincideHuellaDocumento } from "../src/modules/asesores/autorizaciones.utils.js";
import { gestionarCorreoFactura } from "../src/modules/ventas/facturaCorreo.service.js";
import { validarAccesoComprobante } from "../src/modules/ventas/comprobanteAcceso.js";

const id = "507f1f77bcf86cd799439011";
const usuario = { _id: id, rol: "VENTAS" };
const ventaBase = () => ({ _id: id, codigoVenta: "V-001", fecha: new Date("2026-11-04"), estado: "PAGADA", saldoPendiente: 0,
  cliente: { nombre: "Cliente (prueba)", cedula: "123456", correo: "anterior@example.com" }, vehiculo: { placa: "ABC123" }, total: 120000, subtotal: 120000, items: [] });

test("Caja guarda el correo en venta y orden sin enviar si se elige solo guardar", async (t) => {
  const venta = { ...ventaBase(), asesoriaId: id };
  t.mock.method(Venta, "findById", () => ({ lean: async () => venta }));
  t.mock.method(Asesoria, "findById", () => ({ select: () => ({ lean: async () => ({ _id: id, cliente: venta.cliente, flujo: { etapa: "FINALIZADA" } }) }) }));
  t.mock.method(Venta, "updateOne", async (_q, u) => { assert.equal(u.$set["cliente.correo"], "nuevo@example.com"); return { matchedCount: 1 }; });
  const guardarOrden = t.mock.method(Asesoria, "updateOne", async (_q, u) => { assert.equal(u.$set.correoActualizadoEnCaja, "nuevo@example.com"); return { matchedCount: 1 }; });
  const fetch = t.mock.method(globalThis, "fetch", async () => assert.fail("No se debe enviar"));
  assert.deepEqual(await gestionarCorreoFactura(id, { correo: " NUEVO@example.com ", enviar: false }, usuario), { correo: "nuevo@example.com", enviado: false });
  assert.equal(guardarOrden.mock.callCount(), 1);
  assert.equal(fetch.mock.callCount(), 0);
});

test("el enlace del comprobante da acceso solo a la venta pagada y evita duplicar el envío", async (t) => {
  const venta = ventaBase(); venta.auditoria = [];
  const consulta = { lean: async () => venta, populate: () => consulta };
  t.mock.method(Venta, "findById", () => consulta);
  t.mock.method(Venta, "updateOne", async (_q, u) => { venta.auditoria.push(u.$push.auditoria); });
  const fetch = t.mock.method(globalThis, "fetch", async (_url, opciones) => {
    const contenido = JSON.parse(opciones.body);
    assert.deepEqual(contenido.to, [{ email: venta.cliente.correo }]);
    assert.equal(contenido.attachment, undefined);
    const enlace = new URL(contenido.htmlContent.match(/href="([^"]+)"/)[1]);
    assert.equal(enlace.origin, "https://backend.example.com");
    assert.equal(enlace.pathname, `/api/ventas/${id}/comprobante-cliente`);
    const token = enlace.searchParams.get("acceso");
    assert.ok(validarAccesoComprobante(venta, token));
    assert.equal(validarAccesoComprobante({ ...venta, _id: usuario._id.replace(/1$/, "2") }, token), false);
    assert.equal(validarAccesoComprobante({ ...venta, cliente: { correo: "otro@example.com" } }, token), false);
    assert.equal(validarAccesoComprobante({ ...venta, estado: "ANULADA" }, token), false);
    assert.equal(validarAccesoComprobante(venta, "a".repeat(64)), false);
    return { ok: true };
  });
  const entorno = { BREVO_API_KEY: "test", BREVO_SENDER_EMAIL: "prueba@example.com",
    BACKEND_PUBLIC_URL: "https://backend.example.com", JWT_SECRET: "clave-de-prueba" };
  const valores = Object.fromEntries(Object.keys(entorno).map((k) => [k, process.env[k]]));
  Object.assign(process.env, entorno);
  try {
    assert.equal((await gestionarCorreoFactura(id, { correo: venta.cliente.correo, enviar: true }, usuario)).enviado, true);
    assert.equal((await gestionarCorreoFactura(id, { correo: venta.cliente.correo, enviar: true }, usuario)).yaEnviado, true);
    assert.equal(fetch.mock.callCount(), 1);
    venta.estado = "PARCIAL";
    await assert.rejects(gestionarCorreoFactura(id, { correo: venta.cliente.correo, enviar: true }, usuario), /pagada/);
  } finally {
    for (const [k, v] of Object.entries(valores)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});

test("la corrección en Caja conserva la firma previa y detecta cambios a otros datos", () => {
  const orden = ventaBase();
  const documento = { tipo: "ENTREGA", estado: "FIRMADO", contenido: JSON.stringify({ datos: datosDocumento(orden, "ENTREGA") }), huellaDatos: huellaDatos(orden, "ENTREGA") };
  orden.cliente.correo = orden.correoActualizadoEnCaja = "nuevo@example.com";
  assert.ok(coincideHuellaDocumento(orden, documento));
  assert.equal(coincideHuellaDocumento(orden, { ...documento, estado: "PENDIENTE" }), false);
  orden.vehiculo.placa = "OTRA01";
  assert.equal(coincideHuellaDocumento(orden, documento), false);
});
