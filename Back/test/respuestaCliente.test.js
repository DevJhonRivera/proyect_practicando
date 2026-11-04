import test from "node:test";
import assert from "node:assert/strict";
import Asesoria from "../src/modules/asesores/asesoria.model.js";
import Alerta from "../src/modules/alertas/alerta.model.js";
import { obtenerAlertas } from "../src/modules/alertas/alerta.service.js";
import { hash, huellaDatos, nuevoToken, firmaVigente, validarFirmasTrabajo } from "../src/modules/asesores/autorizaciones.utils.js";
import { validarRespuestaCliente } from "../src/modules/asesores/respuestaCliente.utils.js";
import { responderDocumento, firmarDocumento, gestionarRespuestaCliente, emitirDocumento } from "../src/modules/asesores/autorizaciones.service.js";

const asesor = { _id: "507f1f77bcf86cd799439012", rol: "ASESOR", nombre: "Asesor Prueba" };
function fixture(tipo = "COTIZACION") {
  const orden = Asesoria.hydrate({ _id: "507f1f77bcf86cd799439011", codigo: "ASE-PRUEBA", creadoPor: asesor._id,
    asesorNombre: asesor.nombre, cliente: { nombre: "Cliente Prueba", cedula: "123456", correo: "cliente@example.com" },
    vehiculo: { placa: "ABC123", marca: "PRUEBA", modelo: "PRUEBA" }, estado: "COTIZACION", updatedAt: new Date(),
    autorizaciones: { requeridas: true, documentos: [] }, flujo: { etapa: `PENDIENTE_FIRMA_${tipo}` } });
  if (tipo === "DIAGNOSTICO") orden.autorizaciones.documentos.push({ tipo: "COTIZACION", estado: "FIRMADO", huellaDatos: huellaDatos(orden, "COTIZACION") });
  const token = nuevoToken(); const contenido = JSON.stringify({ datos: { codigo: orden.codigo } });
  orden.autorizaciones.documentos.push({ tipo, contenido, huella: hash(contenido), huellaDatos: huellaDatos(orden, tipo),
    tokenHash: hash(token), estado: "PENDIENTE", creadoEn: new Date(), expira: new Date(Date.now() + 60000) });
  const documento = orden.autorizaciones.documentos.at(-1);
  const body = { accion: "RECHAZAR", motivo: "No acepto el precio propuesto", nombre: "Cliente Prueba", cedula: "123456", huella: documento.huella };
  return { orden, documento, token, body };
}

test("rejecting and requesting corrections need identity and a reason, without approval consents or stroke", () => {
  for (const tipo of ["COTIZACION", "DIAGNOSTICO"]) {
    const { orden, documento, body } = fixture(tipo);
    for (const accion of ["RECHAZAR", "SOLICITAR_CORRECCION"]) assert.doesNotThrow(() => validarRespuestaCliente({ ...body, accion }, orden, documento));
    for (const cambio of [{ motivo: " " }, { motivo: "a".repeat(2001) }, { cedula: "999" }, { nombre: " " }, { accion: "APROBAR" }, { huella: "alterada" }]) {
      assert.throws(() => validarRespuestaCliente({ ...body, ...cambio }, orden, documento));
    }
    orden.flujo.etapa = "EN_INSTALACION";
    assert.throws(() => validarRespuestaCliente(body, orden, documento), /etapa/);
  }
});

test("responses are stored atomically once, block work and alert the service owner", async (t) => {
  for (const accion of ["RECHAZAR", "SOLICITAR_CORRECCION"]) {
    const { orden, documento, token, body } = fixture();
    const contenidoOriginal = documento.contenido;
    t.mock.method(Asesoria, "findOne", () => ({ select: async () => orden }));
    t.mock.method(Asesoria, "findOneAndUpdate", async (filter, update) => {
      assert.equal(filter.updatedAt, orden.updatedAt);
      assert.equal(filter["autorizaciones.documentos"].$elemMatch.estado, "PENDIENTE");
      assert.equal(filter["autorizaciones.documentos"].$elemMatch.tokenHash, hash(token));
      documento.estado = update.$set["autorizaciones.documentos.$.estado"];
      documento.respuestaCliente = update.$set["autorizaciones.documentos.$.respuestaCliente"];
      orden.autorizaciones.bloqueoCliente = update.$set["autorizaciones.bloqueoCliente"];
      orden.auditoria.push(update.$push.auditoria);
      return orden;
    });
    const alerta = t.mock.method(Alerta, "findOneAndUpdate", async (filter, update) => {
      assert.equal(String(update.destinatarioId), asesor._id);
      assert.equal(update.tipo, "RESPUESTA_CLIENTE");
      assert.equal(filter.clave, `respuesta-cliente:${documento._id}`);
    });
    const vista = await responderDocumento(token, { ...body, accion }, { ip: "127.0.0.1", agente: "TEST" });
    assert.equal(vista.estado, accion === "RECHAZAR" ? "RECHAZADO" : "CORRECCION_SOLICITADA");
    assert.equal(documento.contenido, contenidoOriginal);
    assert.ok(documento.respuestaCliente.fecha instanceof Date);
    assert.equal(vista.respuestaCliente.ip, undefined);
    assert.equal(vista.firma, null);
    assert.equal(alerta.mock.callCount(), 1);
    assert.throws(() => validarFirmasTrabajo(orden), /Resuelva/);
    await assert.rejects(responderDocumento(token, body), /no admite/);
    await assert.rejects(firmarDocumento(token, {}, {}), /ya tiene una respuesta/);
    assert.equal(Asesoria.findOneAndUpdate.mock.callCount(), 1);
    t.mock.restoreAll();
  }
});

test("concurrent response or approval wins once and does not create a false notification", async (t) => {
  const { orden, token, body } = fixture();
  t.mock.method(Asesoria, "findOne", () => ({ select: async () => orden }));
  t.mock.method(Asesoria, "findOneAndUpdate", async () => null);
  const alerta = t.mock.method(Alerta, "findOneAndUpdate", async () => assert.fail("No notification for unrecorded response"));
  await assert.rejects(responderDocumento(token, body), /cambio o ya tiene respuesta/);
  assert.equal(alerta.mock.callCount(), 0);
});

test("a newer document prevents reuse of an earlier signature even if the content matches", () => {
  const { orden, documento } = fixture();
  documento.estado = "FIRMADO";
  assert.ok(firmaVigente(orden, "COTIZACION"));
  orden.autorizaciones.documentos.push({ tipo: "COTIZACION", estado: "RECHAZADO", huellaDatos: documento.huellaDatos });
  assert.equal(firmaVigente(orden, "COTIZACION"), undefined);
});

test("advisor review preserves rejection, invalidates old links and still requires a new signature", async (t) => {
  const { orden, documento, token } = fixture();
  documento.estado = "CORRECCION_SOLICITADA";
  documento.respuestaCliente = { motivo: "Corregir el material", nombre: "Cliente Prueba", fecha: new Date() };
  orden.autorizaciones.bloqueoCliente = true;
  t.mock.method(Asesoria, "findById", async () => orden);
  t.mock.method(orden, "save", async () => orden);
  t.mock.method(Alerta, "updateMany", async () => ({}));
  await assert.rejects(gestionarRespuestaCliente(String(orden._id), { accion: "PREPARAR_REVISION", nota: "Material corregido" }, { ...asesor, _id: "507f1f77bcf86cd799439099" }), /acceso/);
  await gestionarRespuestaCliente(String(orden._id), { accion: "PREPARAR_REVISION", nota: "Material corregido" }, asesor);
  assert.equal(orden.autorizaciones.bloqueoCliente, false);
  assert.equal(documento.estado, "CORRECCION_SOLICITADA");
  assert.equal(documento.gestionRespuesta.accion, "PREPARAR_REVISION");
  assert.equal(orden.flujo.etapa, "PENDIENTE_FIRMA_COTIZACION");
  assert.throws(() => validarFirmasTrabajo(orden), /cotizacion/);
  t.mock.method(Asesoria, "findOne", () => ({ select: async () => orden }));
  await assert.rejects(firmarDocumento(token, {}, {}), /ya tiene una respuesta/);
});

test("closing requires administration and an explicit vehicle custody confirmation", async (t) => {
  const { orden, documento } = fixture();
  documento.estado = "RECHAZADO"; documento.respuestaCliente = { motivo: "No continuar", fecha: new Date() };
  orden.autorizaciones.bloqueoCliente = true;
  t.mock.method(Asesoria, "findById", async () => orden);
  const body = { accion: "CERRAR", nota: "Cliente solicita cierre" };
  await assert.rejects(gestionarRespuestaCliente(String(orden._id), body, asesor), /administrador/);
  await assert.rejects(gestionarRespuestaCliente(String(orden._id), body, { ...asesor, rol: "ADMIN" }), /vehiculo/);
});

test("blocked orders cannot issue replacement documents or accept pending signatures", async (t) => {
  const { orden, token } = fixture(); orden.autorizaciones.bloqueoCliente = true;
  t.mock.method(Asesoria, "findById", () => ({ select: async () => orden }));
  t.mock.method(Asesoria, "findOne", () => ({ select: async () => orden }));
  await assert.rejects(emitirDocumento(String(orden._id), "COTIZACION", asesor), /gestion/);
  await assert.rejects(firmarDocumento(token, {}, {}), /bloqueado/);
});

test("advisors only query their own customer-response notifications", async (t) => {
  t.mock.method(Alerta, "find", (filter) => {
    assert.deepEqual(filter.$or[1], { tipo: { $in: ["RESPUESTA_CLIENTE", "VEHICULO_LISTO_ASESOR", "FIRMA_CLIENTE"] }, destinatarioId: asesor._id });
    assert.deepEqual(filter.$or[0].tipo.$in, []);
    return { sort: () => ({ limit: () => ({ lean: async () => [] }) }) };
  });
  assert.deepEqual(await obtenerAlertas(asesor, { pendientes: true }), []);
});

test("reissuing after a correction preserves the response and creates a new link requiring fresh approval", async (t) => {
  const { orden, documento, token: anterior } = fixture();
  documento.estado = "CORRECCION_SOLICITADA";
  documento.respuestaCliente = { motivo: "Cambiar el material", nombre: "Cliente Prueba", fecha: new Date() };
  documento.gestionRespuesta = { accion: "PREPARAR_REVISION", nota: "Nueva propuesta preparada", fecha: new Date() };
  const env = { NODE_ENV: "test", BREVO_API_KEY: "test-key", BREVO_SENDER_EMAIL: "prueba@example.com", FRONTEND_PUBLIC_URL: "http://localhost:5173",
    LEGAL_COMPANY_NAME: "Empresa Prueba", LEGAL_COMPANY_ID: "123", LEGAL_ADDRESS: "Direccion de prueba", LEGAL_PHONE: "1234567",
    PRIVACY_EMAIL: "privacidad@example.com", PRIVACY_POLICY_URL: "http://localhost:5173/politica-de-datos" };
  const prev = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  let tokenNuevo;
  t.mock.method(Asesoria, "findById", () => ({ select: async () => orden }));
  t.mock.method(orden, "save", async () => orden);
  t.mock.method(Asesoria, "updateOne", async () => ({}));
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    const mail = JSON.parse(options.body);
    tokenNuevo = mail.textContent.match(/\/firmar#([a-f0-9]{64})/)[1];
    assert.equal(mail.to[0].email, orden.cliente.correo);
    return { ok: true, json: async () => ({ messageId: "mail-test" }) };
  });
  try {
    const resultado = await emitirDocumento(String(orden._id), "COTIZACION", asesor);
    assert.equal(resultado.enviado, true);
    assert.equal(orden.autorizaciones.documentos.length, 2);
    assert.equal(documento.estado, "CORRECCION_SOLICITADA");
    assert.equal(documento.respuestaCliente.motivo, "Cambiar el material");
    assert.equal(orden.autorizaciones.documentos.at(-1).estado, "PENDIENTE");
    assert.notEqual(tokenNuevo, anterior);
    assert.equal(firmaVigente(orden, "COTIZACION"), undefined);
    assert.throws(() => validarFirmasTrabajo(orden), /cotizacion/);
    t.mock.method(Asesoria, "findOne", () => ({ select: async () => orden }));
    await assert.rejects(firmarDocumento(anterior, {}, {}), /ya tiene una respuesta/);
  } finally {
    for (const [key, value] of Object.entries(prev)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
