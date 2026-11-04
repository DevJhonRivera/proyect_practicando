import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { validarCantidadFotos, validarFotosUnicas, validarImagen } from "../src/modules/asesores/fotosDiagnostico.utils.js";
import { crearCorreoDocumento } from "../src/modules/asesores/correoDocumento.utils.js";
import { validarFirma, huellaDatos } from "../src/modules/asesores/autorizaciones.utils.js";
import { emitirDocumento, guardarDiagnostico } from "../src/modules/asesores/autorizaciones.service.js";
import Asesoria from "../src/modules/asesores/asesoria.model.js";

test("diagnostic photo count is enforced at both boundaries and duplicates are rejected", () => {
  for (const n of [0, 1, 3, 11]) assert.throws(() => validarCantidadFotos(Array(n).fill({})), /mínimo 4 y máximo 10/);
  for (const n of [4, 10]) assert.doesNotThrow(() => validarFotosUnicas(Array.from({ length: n }, (_, i) => ({ sha256: String(i) }))));
  assert.throws(() => validarFotosUnicas(Array(4).fill({ sha256: "same" })), /diferentes/);
});

test("image uploads reject HTML, SVG, malformed JPEG and excessive payloads", () => {
  for (const value of ["data:text/html;base64,PHNjcmlwdD4=", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/jpeg;base64,aGVsbG8=", "data:image/jpeg;base64," + "A".repeat(260000)]) assert.throws(() => validarImagen(value));
});

test("a diagnostic confirmation does not manufacture fresh general consents", () => {
  const orden = { cliente: { cedula: "123456" } };
  const body = { nombre: "Cliente Prueba", cedula: "123456", aceptaciones: { documento: true }, trazo: Array.from({ length: 15 }, (_, i) => [i / 20, i / 30, i ? 0 : 1]) };
  assert.doesNotThrow(() => validarFirma(body, orden, { contenido: JSON.stringify({ aceptacionesRequeridas: ["documento"] }) }));
  assert.throws(() => validarFirma(body, orden, { contenido: JSON.stringify({ aceptacionesRequeridas: ["documento", "datos", "condiciones", "firmaElectronica"] }) }), /expresamente/);
  assert.throws(() => validarFirma({ ...body, aceptaciones: { documento: false } }, orden, { contenido: JSON.stringify({ aceptacionesRequeridas: ["documento"] }) }));
});

test("email template has a clear action, escaped customer text and diagnostic attachments", () => {
  const contenido = { datos: { cliente: { nombre: "<script>alert(1)</script>" }, vehiculo: { placa: "ABC123" } }, condiciones: { responsable: "Empresa de prueba" } };
  const fotos = Array.from({ length: 4 }, (_, i) => ({ dataUrl: `data:image/jpeg;base64,${Buffer.from(`foto-${i}`).toString("base64")}` }));
  const correo = crearCorreoDocumento({ tipo: "DIAGNOSTICO", codigo: "TEST", url: "https://example.com/firmar#token", contenido, fotos });
  assert.match(correo.html, /Revisar diagnóstico y fotos/); assert.match(correo.html, /max-width:600px/);
  assert.doesNotMatch(correo.html, /<script>/); assert.match(correo.html, /&lt;script&gt;/);
  assert.equal(correo.attachments.length, 4); assert.equal(correo.attachments[0].filename, "diagnostico-1.jpg");
  assert.match(correo.text, /solo confirmarás/);
  const cotizacion = crearCorreoDocumento({ tipo: "COTIZACION", codigo: "T", url: "https://example.com", contenido });
  assert.equal(cotizacion.attachments, undefined); assert.match(cotizacion.html, /Total acordado/);
});

test("new empty photo fields preserve existing diagnostic fingerprints", () => {
  const original = { codigo: "T", cliente: { nombre: "C" }, vehiculo: { placa: "ABC123" }, recepcion: { observaciones: "Sin novedad" } };
  assert.equal(huellaDatos(original, "DIAGNOSTICO"), huellaDatos({ ...original, recepcion: { ...original.recepcion, fotos: [] } }, "DIAGNOSTICO"));
  assert.notEqual(huellaDatos(original, "DIAGNOSTICO"), huellaDatos({ ...original, recepcion: { ...original.recepcion, fotos: [{ fotoId: "id", sha256: "hash" }] } }, "DIAGNOSTICO"));
});

test("emitting or saving a diagnostic without four photos fails before mail or storage", async () => {
  const find = Asesoria.findById;
  const user = { _id: "507f1f77bcf86cd799439011", rol: "ADMIN" };
  const orden = { _id: user._id, creadoPor: user._id, codigo: "T", cliente: { correo: "test@example.com" }, vehiculo: {}, recepcion: {}, flujo: { etapa: "PENDIENTE_FIRMA_DIAGNOSTICO" }, autorizaciones: { requeridas: true, documentos: [] } };
  orden.autorizaciones.documentos.push({ tipo: "COTIZACION", estado: "FIRMADO", firma: { aceptaciones: { datos: true } }, huellaDatos: huellaDatos(orden, "COTIZACION") });
  const fake = { select: async () => orden, then: (resolve) => resolve(orden) };
  Asesoria.findById = () => fake;
  const required = ["LEGAL_COMPANY_NAME", "LEGAL_COMPANY_ID", "LEGAL_ADDRESS", "LEGAL_PHONE", "PRIVACY_EMAIL", "PRIVACY_POLICY_URL"];
  const previous = required.map((key) => process.env[key]); required.forEach((key) => process.env[key] = key === "PRIVACY_POLICY_URL" ? "https://example.com/privacy" : "Test");
  try {
    await assert.rejects(emitirDocumento(user._id, "DIAGNOSTICO", user), /mínimo 4/);
    await assert.rejects(guardarDiagnostico(user._id, { recepcion: {}, seguroEstado: "NO", fotos: Array(3).fill({}) }, user), /mínimo 4/);
  } finally { Asesoria.findById = find; required.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }); }
});


test("optimized JPEG photographs retain a stable fingerprint", () => {
  const bytes = readFileSync(new URL("./fixtures/diagnostico.jpg", import.meta.url));
  const foto = validarImagen(`data:image/jpeg;base64,${bytes.toString("base64")}`);
  assert.match(foto.sha256, /^[a-f0-9]{64}$/);
  assert.equal(validarImagen(foto.dataUrl).sha256, foto.sha256);
});
