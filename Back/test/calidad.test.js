import test from "node:test";
import assert from "node:assert/strict";
import Asesoria from "../src/modules/asesores/asesoria.model.js";
import Corte from "../src/modules/cortes/corte.model.js";
import Alerta from "../src/modules/alertas/alerta.model.js";
import { revisarCalidad, actualizarAsignacion, marcarMaterialListo, enviarTrabajoAVentas } from "../src/modules/coordinacion/coordinacion.service.js";
import { validarRevisionCalidad } from "../src/modules/coordinacion/calidad.utils.js";
import { crearCorreoVehiculoListo } from "../src/modules/coordinacion/notificacionCalidad.service.js";
import { hash, huellaDatos } from "../src/modules/asesores/autorizaciones.utils.js";

const coordinador = { _id: "507f1f77bcf86cd799439012", rol: "COORDINADOR", nombre: "Coordinador Prueba" };
const instalador = { _id: "507f1f77bcf86cd799439013", rol: "INSTALADOR", nombre: "Instalador Prueba" };
function preparar(t) {
  const orden = Asesoria.hydrate({ _id: "507f1f77bcf86cd799439011", codigo: "ASE-QA", creadoPor: "507f1f77bcf86cd799439014", asesorNombre: "Asesor Prueba",
    cliente: { nombre: "Cliente Prueba", cedula: "123456", correo: "cliente@example.com" }, vehiculo: { placa: "ABC123", marca: "TEST", modelo: "TEST" },
    estado: "APROBADA", flujo: { etapa: "PENDIENTE_CALIDAD" }, polarizados: [{ material: "TEST", porcentaje: "20", partes: ["DELANTERAS"], valor: 100 }],
    coordinacion: { calidad: { requerida: true, estado: "PENDIENTE" }, asignaciones: [
      { servicio: "POLARIZADO 1", descripcion: "DELANTERAS", instaladorId: instalador._id, instaladorNombre: instalador.nombre, estado: "COMPLETADA", fechaInicio: new Date("2026-11-04T08:00:00Z"), fechaFinalizacion: new Date("2026-11-04T09:00:00Z"), valorInstalacion: 20000 },
      { servicio: "ADICIONAL 1", descripcion: "Limpieza", instaladorId: instalador._id, instaladorNombre: instalador.nombre, estado: "COMPLETADA", valorInstalacion: 10000 },
    ] } });
  t.mock.method(Asesoria, "findById", async () => orden);
  t.mock.method(orden, "save", async () => orden);
  t.mock.method(Alerta, "findOneAndUpdate", async () => ({}));
  t.mock.method(Alerta, "updateMany", async () => ({}));
  t.mock.method(globalThis, "fetch", async () => assert.fail("No email before quality approval"));
  return orden;
}
const datos = (o, decision) => ({ decision, observacion: "Corregir burbujas en vidrio lateral", asignaciones: [String(o.coordinacion.asignaciones[0]._id)], lineasRecorte: ["POLARIZADO 1"] });

test("quality rejects unfinished work, missing reasons, unrelated installations and unrelated material", (t) => {
  const o = preparar(t); const d = datos(o, "RECORTE");
  assert.doesNotThrow(() => validarRevisionCalidad(o, d));
  for (const body of [{ ...d, observacion: " " }, { ...d, decision: "OTRA" }, { ...d, asignaciones: ["unknown"] }, { ...d, lineasRecorte: ["PPF 1"] }, { ...d, asignaciones: o.coordinacion.asignaciones.map((a) => String(a._id)) }]) assert.throws(() => validarRevisionCalidad(o, body));
  o.coordinacion.asignaciones[0].estado = "EN_PROCESO";
  assert.throws(() => validarRevisionCalidad(o, datos(o, "APROBAR")), /terminadas/);
});

test("correction without material preserves history, reopens only selected work and requires another quality review", async (t) => {
  const o = preparar(t); const a = o.coordinacion.asignaciones[0];
  await revisarCalidad(String(o._id), datos(o, "CORREGIR"), coordinador);
  assert.equal(o.flujo.etapa, "REPROCESO");
  assert.equal(a.estado, "PENDIENTE"); assert.equal(a.fechaInicio, null);
  assert.equal(o.coordinacion.asignaciones[1].estado, "COMPLETADA");
  assert.equal(o.coordinacion.calidad.revisiones[0].asignaciones[0].fechaFinalizacion.toISOString(), "2026-11-04T09:00:00.000Z");
  assert.equal(o.novedades.length, 0);
  await assert.rejects(enviarTrabajoAVentas(String(o._id)), /aprobar calidad/);
  await actualizarAsignacion(String(o._id), String(a._id), { estado: "EN_PROCESO" }, instalador);
  await actualizarAsignacion(String(o._id), String(a._id), { estado: "COMPLETADA" }, instalador);
  assert.equal(o.flujo.etapa, "PENDIENTE_CALIDAD"); assert.equal(o.coordinacion.calidad.estado, "PENDIENTE");
  assert.equal(a.valorInstalacion, 20000);
});

test("recutting requires admin approval, real replacement cuts and coordinator receipt before installer restart", async (t) => {
  const o = preparar(t); const a = o.coordinacion.asignaciones[0];
  await revisarCalidad(String(o._id), datos(o, "RECORTE"), coordinador);
  const novedad = o.novedades[0];
  assert.equal(novedad.tipo, "REPETICION_CORTE"); assert.equal(novedad.estado, "PENDIENTE");
  assert.equal(String(novedad.instaladorId), instalador._id);
  assert.equal(a.estado, "ESPERANDO_MATERIAL");
  await assert.rejects(actualizarAsignacion(String(o._id), String(a._id), { estado: "EN_PROCESO" }, instalador), /novedades/);
  await assert.rejects(marcarMaterialListo(String(o._id), coordinador), /novedades/);
  novedad.estado = "RESUELTA";
  t.mock.method(Corte, "find", () => ({ select: () => ({ lean: async () => [] }) }));
  await assert.rejects(marcarMaterialListo(String(o._id), coordinador), /Faltan cortes nuevos/);
  await assert.rejects(marcarMaterialListo(String(o._id), { ...coordinador, rol: "INVENTARIO" }), /Coordinacion/);
  t.mock.method(Corte, "find", (query) => {
    assert.equal(String(query.novedadId), String(novedad._id));
    return { select: () => ({ lean: async () => [{ asesoriaLineaOrigen: "POLARIZADO 1" }] }) };
  });
  await assert.rejects(actualizarAsignacion(String(o._id), String(a._id), { estado: "EN_PROCESO" }, instalador), /pendiente de inicio/);
  await marcarMaterialListo(String(o._id), coordinador);
  assert.ok(o.coordinacion.calidad.revisiones[0].materialRecibidoEn instanceof Date);
  assert.equal(a.estado, "PENDIENTE");
  await actualizarAsignacion(String(o._id), String(a._id), { estado: "EN_PROCESO" }, instalador);
  await actualizarAsignacion(String(o._id), String(a._id), { estado: "COMPLETADA" }, instalador);
  assert.equal(o.flujo.etapa, "PENDIENTE_CALIDAD");
  assert.equal(o.coordinacion.calidad.estado, "PENDIENTE");
});

test("a rejected recut cannot be approved as finished and can be redirected to correction", async (t) => {
  const o = preparar(t);
  await revisarCalidad(String(o._id), datos(o, "RECORTE"), coordinador);
  o.novedades[0].estado = "RECHAZADA";
  await assert.rejects(revisarCalidad(String(o._id), datos(o, "APROBAR"), coordinador), /resolver el recorte/);
  await revisarCalidad(String(o._id), datos(o, "CORREGIR"), coordinador);
  assert.equal(o.coordinacion.calidad.revisiones.length, 2);
  assert.equal(o.coordinacion.asignaciones[0].estado, "PENDIENTE");
});

test("only coordinators can review quality and installers cannot start another installer's work", async (t) => {
  const o = preparar(t);
  await assert.rejects(revisarCalidad(String(o._id), datos(o, "APROBAR"), instalador), /Solo coordinacion/);
  await revisarCalidad(String(o._id), datos(o, "CORREGIR"), coordinador);
  await assert.rejects(actualizarAsignacion(String(o._id), String(o.coordinacion.asignaciones[0]._id), { estado: "EN_PROCESO" }, { ...instalador, _id: "507f1f77bcf86cd799439099" }), /otro instalador/);
});

test("approved quality notifies the advisor and customer; retry does not duplicate approval or sent email", async (t) => {
  const o = preparar(t);
  const prevKey = process.env.BREVO_API_KEY; const prevFrom = process.env.BREVO_SENDER_EMAIL;
  process.env.BREVO_API_KEY = "test"; process.env.BREVO_SENDER_EMAIL = "test@example.com";
  const alertas = [];
  t.mock.method(Alerta, "findOneAndUpdate", async (_query, update) => { alertas.push(update); return {}; });
  t.mock.method(Asesoria, "findOneAndUpdate", async (_query, update) => { for (const [k, v] of Object.entries(update.$set)) o.set(k, v); return o; });
  t.mock.method(Asesoria, "updateOne", async (_query, update) => { for (const [k, v] of Object.entries(update.$set)) o.set(k, v); return {}; });
  const envio = t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(o.coordinacion.calidad.estado, "APROBADA");
    assert.equal(o.flujo.etapa, "PENDIENTE_PAGO");
    assert.equal(JSON.parse(options.body).to[0].email, o.cliente.correo);
    assert.match(JSON.parse(options.body).headers.idempotencyKey, /^[a-f0-9-]{36}$/);
    return { ok: true, json: async () => ({ messageId: "test-mail" }) };
  });
  try {
    const resultado = await revisarCalidad(String(o._id), datos(o, "APROBAR"), coordinador);
    assert.equal(resultado.aviso.enviado, true);
    assert.equal(o.coordinacion.calidad.aviso.estado, "ENVIADO");
    assert.ok(alertas.some((a) => a.tipo === "VEHICULO_LISTO_ASESOR" && String(a.destinatarioId) === String(o.creadoPor)));
    await revisarCalidad(String(o._id), { decision: "APROBAR" }, coordinador);
    assert.equal(o.coordinacion.calidad.revisiones.length, 1);
    assert.equal(envio.mock.callCount(), 1);
  } finally { if (prevKey === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = prevKey; if (prevFrom === undefined) delete process.env.BREVO_SENDER_EMAIL; else process.env.BREVO_SENDER_EMAIL = prevFrom; }
});

test("the schema blocks direct delivery or billing while quality is pending", async (t) => {
  const o = preparar(t); o.flujo.etapa = "PENDIENTE_PAGO";
  await assert.rejects(Asesoria.schema.s.hooks.execPre("save", o, []), /aprobar calidad/);
});

test("mail failure retains approval and allows retry with the same idempotency key", async (t) => {
  const o = preparar(t);
  o.autorizaciones.requeridas = true;
  for (const tipo of ["COTIZACION", "DIAGNOSTICO"]) {
    o.autorizaciones.documentos.push({ tipo, estado: "FIRMADO", huella: hash(tipo), huellaDatos: huellaDatos(o, tipo),
      firma: { fecha: new Date(), aceptaciones: { datos: true, condiciones: true, firmaElectronica: true } } });
  }
  t.mock.method(Asesoria, "findById", () => ({ then: (resolve) => resolve(o), select: async () => o }));
  for (const [clave, valor] of Object.entries({
    JWT_SECRET: "prueba", FRONTEND_PUBLIC_URL: "https://example.com",
    LEGAL_COMPANY_NAME: "Polarizados Ya", LEGAL_COMPANY_ID: "123456", LEGAL_ADDRESS: "Calle de prueba",
    LEGAL_PHONE: "1234567", PRIVACY_EMAIL: "datos@example.com", PRIVACY_POLICY_URL: "https://example.com/politica-de-datos",
  })) {
    const anterior = process.env[clave];
    process.env[clave] = valor;
    t.after(() => { if (anterior === undefined) delete process.env[clave]; else process.env[clave] = anterior; });
  }
  const before = { key: process.env.BREVO_API_KEY, from: process.env.BREVO_SENDER_EMAIL };
  process.env.BREVO_API_KEY = "test"; process.env.BREVO_SENDER_EMAIL = "test@example.com";
  t.mock.method(Asesoria, "findOneAndUpdate", async (_q, update) => { for (const [k, v] of Object.entries(update.$set)) o.set(k, v); return o; });
  t.mock.method(Asesoria, "updateOne", async (filtro, update) => {
    const prefijo = "autorizaciones.documentos.$.";
    for (const [k, v] of Object.entries(update.$set)) {
      if (k.startsWith(prefijo)) o.autorizaciones.documentos.id(filtro["autorizaciones.documentos._id"]).set(k.slice(prefijo.length), v);
      else o.set(k, v);
    }
    return {};
  });
  const keys = [];
  const enlaces = [];
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    const mensaje = JSON.parse(options.body);
    keys.push(mensaje.headers.idempotencyKey);
    enlaces.push(mensaje.textContent.match(/https:\/\/example\.com\/firmar#[a-f0-9]{64}/)?.[0]);
    assert.match(mensaje.htmlContent, /Ver acta de entrega/);
    return keys.length === 1 ? { ok: false, status: 403 } : { ok: true, json: async () => ({ messageId: "retry-mail" }) };
  });
  try {
    const result = await revisarCalidad(String(o._id), datos(o, "APROBAR"), coordinador);
    assert.equal(result.aviso.enviado, false); assert.equal(o.coordinacion.calidad.aviso.estado, "ERROR");
    assert.equal(o.coordinacion.calidad.estado, "APROBADA"); assert.equal(o.flujo.etapa, "PENDIENTE_PAGO");
    await revisarCalidad(String(o._id), { decision: "APROBAR" }, coordinador);
    assert.equal(o.coordinacion.calidad.aviso.estado, "ENVIADO", o.coordinacion.calidad.aviso.error); assert.equal(keys[0], keys[1]);
    assert.ok(enlaces[0]);
    assert.equal(enlaces[0], enlaces[1]);
    assert.equal(o.autorizaciones.documentos.filter((d) => d.tipo === "ENTREGA").length, 1);
    assert.equal(o.coordinacion.calidad.revisiones.length, 1);
  } finally { for (const [name, value] of [["BREVO_API_KEY", before.key], ["BREVO_SENDER_EMAIL", before.from]]) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } }
});

test("vehicle-ready emails escape client data and do not approve delivery or waive payment", () => {
  const correo = crearCorreoVehiculoListo({ codigo: "ASE-TEST", cliente: { nombre: "<script>" }, vehiculo: { placa: "ABC123" } });
  assert.ok(!correo.html.includes("<script>"));
  assert.match(correo.text, /coordinar la entrega/);
});
