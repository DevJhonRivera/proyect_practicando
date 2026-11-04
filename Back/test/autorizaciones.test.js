import test from "node:test";
import assert from "node:assert/strict";
import Asesoria from "../src/modules/asesores/asesoria.model.js";
import Alerta from "../src/modules/alertas/alerta.model.js";
import { conectarUsuario } from "../src/modules/tiempoReal/canales.js";
import { datosDocumento, firmaVigente, hash, huellaDatos, nuevoToken, validarFirma, validarFirmasTrabajo, validarFirmaEntrega } from "../src/modules/asesores/autorizaciones.utils.js";
import { consultarDocumento, emitirDocumento, firmarDocumento, enviarCorreoDocumento } from "../src/modules/asesores/autorizaciones.service.js";
const base = () => ({ codigo: "ASE-TEST", cliente: { nombre: "Cliente Prueba", cedula: "123456", correo: "cliente@example.com" }, vehiculo: { placa: "ABC123" }, polarizados: [{ material: "CERAMICO", porcentaje: "20%", partes: ["DELANTERAS"], valor: 100 }], comercial: { valorVenta: 100, totalAcordado: 100, descuento: 0 }, recepcion: { dejaObjetos: true, detalleObjetos: "Cargador" }, seguroVehiculo: { estado: "NO" }, autorizaciones: { requeridas: true, documentos: [] } });
const firmada = (o, tipo) => o.autorizaciones.documentos.push({ tipo, estado: "FIRMADO", huellaDatos: huellaDatos(o, tipo) });
const cuerpo = () => ({ nombre: "Cliente Prueba", cedula: "123456", aceptaciones: { documento: true, datos: true, condiciones: true, firmaElectronica: true }, trazo: Array.from({ length: 15 }, (_, i) => [i / 20, i / 30, i ? 0 : 1]) });
test("work requires quote and diagnostic; billing also requires delivery signature", () => {
  const o = base(); assert.throws(() => validarFirmasTrabajo(o), /cotizacion/);
  firmada(o, "COTIZACION"); assert.throws(() => validarFirmasTrabajo(o), /diagnostico/);
  firmada(o, "DIAGNOSTICO"); assert.doesNotThrow(() => validarFirmasTrabajo(o));
  assert.throws(() => validarFirmaEntrega(o), /recepcion/); firmada(o, "ENTREGA"); assert.doesNotThrow(() => validarFirmaEntrega(o));
});
test("material and price changes invalidate consent; belongings require a new diagnostic", () => {
  const o = base(); firmada(o, "COTIZACION"); firmada(o, "DIAGNOSTICO");
  o.recepcion.detalleObjetos = "Gafas"; assert.ok(firmaVigente(o, "COTIZACION")); assert.equal(firmaVigente(o, "DIAGNOSTICO"), undefined);
  o.polarizados[0].material = "OTRO"; assert.equal(firmaVigente(o, "COTIZACION"), undefined);
  const otra = base(); firmada(otra, "COTIZACION"); otra.comercial.totalAcordado = 1; assert.equal(firmaVigente(otra, "COTIZACION"), undefined);
});
test("internal inventory changes do not alter the signed customer document", () => {
  const o = base(); o.accesorios = [{ nombre: "A", cantidad: 1, valor: 10, cantidadPendiente: 1, estadoInventario: "PENDIENTE_STOCK" }];
  const antes = huellaDatos(o, "COTIZACION"); o.accesorios[0].cantidadPendiente = 0; o.accesorios[0].estadoInventario = "RESERVADO";
  assert.equal(huellaDatos(o, "COTIZACION"), antes); assert.equal(datosDocumento(o, "COTIZACION").recepcion, undefined);
});
test("identity, explicit individual consents and a real bounded stroke are mandatory", () => {
  const o = base(); assert.doesNotThrow(() => validarFirma(cuerpo(), o));
  assert.throws(() => validarFirma({ ...cuerpo(), cedula: "99999" }, o), /titular/);
  for (const key of Object.keys(cuerpo().aceptaciones)) { const b = cuerpo(); b.aceptaciones[key] = false; assert.throws(() => validarFirma(b, o), /expresamente/); }
  assert.throws(() => validarFirma({ ...cuerpo(), trazo: [] }, o), /Dibuje/);
  assert.throws(() => validarFirma({ ...cuerpo(), trazo: Array(20).fill([0.5, 0.5, 0]) }, o), /trazo/);
  assert.throws(() => validarFirma({ ...cuerpo(), trazo: Array(20).fill([2, 0.5, 0]) }, o), /Dibuje/);
});
test("tokens are random; expired, stale or already signed documents cannot be approved", async () => {
  const original = Asesoria.findOne; const token = nuevoToken(); assert.notEqual(token, nuevoToken()); assert.notEqual(hash(token), token);
  const o = base(); const contenido = JSON.stringify({ datos: datosDocumento(o, "COTIZACION") });
  const d = { _id: "doc", tipo: "COTIZACION", contenido, huella: hash(contenido), huellaDatos: huellaDatos(o, "COTIZACION"), tokenHash: hash(token), estado: "PENDIENTE", expira: new Date(Date.now() - 1000) };
  o.autorizaciones.documentos.push(d); Asesoria.findOne = () => ({ select: async () => o });
  try {
    await assert.rejects(consultarDocumento(token), /vencido/); d.expira = new Date(Date.now() + 60000);
    await assert.rejects(firmarDocumento(token, { ...cuerpo(), huella: "incorrecta" }, {}), /coincide/);
    d.estado = "FIRMADO"; await assert.rejects(firmarDocumento(token, cuerpo(), {}), /ya tiene una respuesta/);
    d.estado = "PENDIENTE"; o.comercial.totalAcordado = 1; await assert.rejects(consultarDocumento(token), /cambio/);
  } finally { Asesoria.findOne = original; }
});
test("a concurrent edit or previous signature makes the atomic approval fail", async () => {
  const find = Asesoria.findOne; const update = Asesoria.findOneAndUpdate; const token = nuevoToken(); const o = base(); o._id = "order"; o.updatedAt = new Date();
  const contenido = JSON.stringify({ datos: datosDocumento(o, "COTIZACION") });
  const d = { _id: "doc", tipo: "COTIZACION", contenido, huella: hash(contenido), huellaDatos: huellaDatos(o, "COTIZACION"), tokenHash: hash(token), estado: "PENDIENTE", expira: new Date(Date.now() + 60000) }; o.autorizaciones.documentos.push(d);
  Asesoria.findOne = () => ({ select: async () => o });
  Asesoria.findOneAndUpdate = async (filtro, cambios) => { assert.equal(filtro.updatedAt, o.updatedAt); assert.equal(filtro["autorizaciones.documentos"].$elemMatch.estado, "PENDIENTE"); assert.equal(cambios.$set["flujo.etapa"], "PENDIENTE_FIRMA_DIAGNOSTICO"); return null; };
  try {
    await assert.rejects(firmarDocumento(token, { ...cuerpo(), huella: d.huella }, {}), /Confirme que su nombre/);
    await assert.rejects(firmarDocumento(token, { huella: d.huella, trazo: cuerpo().trazo, aceptaciones: { ...cuerpo().aceptaciones, identidad: true } }, {}), /cambio o el documento ya/);
  }
  finally { Asesoria.findOne = find; Asesoria.findOneAndUpdate = update; }
});
test("positional document updates create timestamped email events", async () => {
  const o = Asesoria.hydrate({ flujo: { etapa: "PENDIENTE_FIRMA_COTIZACION" }, autorizaciones: { requeridas: true, documentos: [{ _id: "507f1f77bcf86cd799439011", tipo: "COTIZACION", estado: "PENDIENTE", envio: "PENDIENTE" }] } });
  const query = Asesoria.findOneAndUpdate({ _id: o._id, "autorizaciones.documentos._id": o.autorizaciones.documentos[0]._id }, { $set: { "autorizaciones.documentos.$.envio": "ENVIADO" } });
  query.model = { base: Asesoria.base, schema: Asesoria.schema, findOne: async () => o };
  await Asesoria.schema.s.hooks.execPre("findOneAndUpdate", query, []);
  const eventos = query.getUpdate().$push.trazabilidad.$each;
  assert.equal(eventos.length, 1); assert.match(eventos[0].proceso, /^CORREO:/); assert.equal(eventos[0].estado, "ENVIADO");
});
test("a mail provider error is never reported as a successful send", async () => {
  const keys = ["BREVO_API_KEY", "BREVO_SENDER_EMAIL", "FRONTEND_PUBLIC_URL"]; const prev = keys.map((k) => process.env[k]); const fetchAnterior = globalThis.fetch;
  process.env.BREVO_API_KEY = "test"; process.env.BREVO_SENDER_EMAIL = "test@example.com"; process.env.FRONTEND_PUBLIC_URL = "https://example.com"; globalThis.fetch = async () => ({ ok: false });
  try { await assert.rejects(enviarCorreoDocumento({ correo: "test@example.com", codigo: "T", tipo: "COTIZACION", token: nuevoToken() }), /no acept[oó]/); }
  finally { keys.forEach((k, i) => { if (prev[i] === undefined) delete process.env[k]; else process.env[k] = prev[i]; }); globalThis.fetch = fetchAnterior; }
});


test("the data model blocks direct advancement without the two customer signatures", async () => {
  const o = Asesoria.hydrate({ ...base(), flujo: { etapa: "PENDIENTE_FIRMA_COTIZACION" } });
  const q = Asesoria.findOneAndUpdate({ codigo: "ASE-TEST" }, { $set: { "flujo.etapa": "PENDIENTE_COORDINACION" } });
  q.model = { base: Asesoria.base, schema: Asesoria.schema, findOne: async () => o };
  await assert.rejects(Asesoria.schema.s.hooks.execPre("findOneAndUpdate", q, []), /cotizacion/);
});

test("a valid quote signature is retained, notifies its advisor and blocks resending", async (t) => {
  const find = Asesoria.findOne; const update = Asesoria.findOneAndUpdate;
  const o = Asesoria.hydrate({ ...base(), _id: "507f1f77bcf86cd799439011", creadoPor: "507f1f77bcf86cd799439012", updatedAt: new Date(), flujo: { etapa: "PENDIENTE_FIRMA_COTIZACION" } });
  const eventos = [];
  const conexion = conectarUsuario(o.creadoPor, { write: (evento) => eventos.push(evento) });
  t.after(() => conexion.desconectar());
  const alerta = t.mock.method(Alerta, "findOneAndUpdate", async () => null);
  t.mock.method(Asesoria, "findById", () => ({ select: async () => o }));
  const token = nuevoToken(); const contenido = JSON.stringify({ datos: datosDocumento(o, "COTIZACION") });
  o.autorizaciones.documentos.push({ tipo: "COTIZACION", contenido, huella: hash(contenido), huellaDatos: huellaDatos(o, "COTIZACION"), tokenHash: hash(token), estado: "PENDIENTE", expira: new Date(Date.now() + 60000), creadoEn: new Date() });
  const d = o.autorizaciones.documentos[0];
  Asesoria.findOne = () => ({ select: async () => o });
  Asesoria.findOneAndUpdate = async (filtro, cambios) => {
    assert.equal(String(filtro["autorizaciones.documentos"].$elemMatch._id), String(d._id));
    d.estado = cambios.$set["autorizaciones.documentos.$.estado"];
    d.firma = cambios.$set["autorizaciones.documentos.$.firma"];
    o.flujo.etapa = cambios.$set["flujo.etapa"];
    return o;
  };
  try {
    const recibo = await firmarDocumento(token, { huella: d.huella, trazo: cuerpo().trazo, aceptaciones: { ...cuerpo().aceptaciones, identidad: true } }, { ip: "127.0.0.1", agente: "test" });
    assert.equal(recibo.estado, "FIRMADO"); assert.equal(recibo.huella, hash(contenido));
    assert.equal(recibo.firma.nombre, "Cliente Prueba"); assert.equal(recibo.firma.trazo.length, 15);
    assert.equal(d.firma.aceptaciones.identidad, true);
    assert.equal(o.flujo.etapa, "PENDIENTE_FIRMA_DIAGNOSTICO");
    assert.equal(recibo.tokenHash, undefined); assert.equal(recibo.firma.ip, undefined);
    assert.equal(alerta.mock.callCount(), 1);
    const [filtro, { $setOnInsert: aviso }] = alerta.mock.calls[0].arguments;
    assert.equal(filtro.clave, `firma-cliente:${d._id}`);
    assert.equal(aviso.tipo, "FIRMA_CLIENTE");
    assert.equal(String(aviso.destinatarioId), String(o.creadoPor));
    assert.match(eventos.at(-1), /event: firma-cliente/);
    await assert.rejects(emitirDocumento(String(o._id), "COTIZACION", { _id: o.creadoPor, rol: "ASESOR" }), /firma vigente/);
  } finally { Asesoria.findOne = find; Asesoria.findOneAndUpdate = update; }
});


test("mail rejections explain sender restrictions and invalid keys without leaking provider text", async () => {
  const keys = ["BREVO_API_KEY", "BREVO_SENDER_EMAIL", "FRONTEND_PUBLIC_URL"]; const prev = keys.map((k) => process.env[k]); const fetchAnterior = globalThis.fetch;
  process.env.BREVO_API_KEY = "test"; process.env.BREVO_SENDER_EMAIL = "test@example.com"; process.env.FRONTEND_PUBLIC_URL = "https://example.com";
  const datos = { correo: "test@example.com", codigo: "T", tipo: "COTIZACION", token: nuevoToken() };
  try {
    globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({ message: "Sender not verified. private-provider-info" }) });
    await assert.rejects(enviarCorreoDocumento(datos), (e) => e.message.includes("remitente verificado") && !e.message.includes("private-provider-info"));
    globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ message: "API key is invalid: secret-test" }) });
    await assert.rejects(enviarCorreoDocumento(datos), (e) => e.message.includes("BREVO_API_KEY") && !e.message.includes("secret-test"));
  } finally { keys.forEach((k, i) => { if (prev[i] === undefined) delete process.env[k]; else process.env[k] = prev[i]; }); globalThis.fetch = fetchAnterior; }
});
