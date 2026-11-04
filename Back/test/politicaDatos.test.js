import test from "node:test";
import assert from "node:assert/strict";
import { obtenerPoliticaDatos } from "../src/modules/privacidad/politicaDatos.js";
import { condicionesDocumento, hash } from "../src/modules/asesores/autorizaciones.utils.js";
const env = { LEGAL_COMPANY_NAME: "Empresa de prueba", LEGAL_COMPANY_ID: "000000", LEGAL_ADDRESS: "Dirección de prueba", LEGAL_PHONE: "000000", PRIVACY_EMAIL: "privacidad@example.com", PRIVACY_POLICY_URL: "https://example.com/politica-de-datos" };
test("public policy contains the responsible party, rights and procedures without secrets", () => {
  const politica = obtenerPoliticaDatos({ ...env, JWT_SECRET: "secret-marker", BREVO_API_KEY: "secret-marker" });
  assert.equal(politica.responsable.correo, env.PRIVACY_EMAIL);
  assert.equal(politica.secciones.length, 10);
  assert.doesNotMatch(JSON.stringify(politica), /secret-marker/);
  for (const id of ["datos", "derechos", "solicitudes", "proveedores", "conservacion", "versiones"]) assert.ok(politica.secciones.some((s) => s.id === id));
  assert.match(JSON.stringify(politica), /10 días hábiles/); assert.match(JSON.stringify(politica), /15 días hábiles/);
});
test("policy fingerprint changes with the responsible party and missing identification is rejected", () => {
  assert.equal(obtenerPoliticaDatos(env).huella, obtenerPoliticaDatos(env).huella);
  assert.notEqual(obtenerPoliticaDatos(env).huella, obtenerPoliticaDatos({ ...env, PRIVACY_EMAIL: "otro@example.com" }).huella);
  assert.throws(() => obtenerPoliticaDatos({ ...env, LEGAL_COMPANY_ID: "" }), /LEGAL_COMPANY_ID/);
});
test("conditions retain full policy snapshot alongside the short summary", () => {
  const keys = Object.keys(env); const prev = keys.map((k) => process.env[k]); keys.forEach((k) => { process.env[k] = env[k]; });
  try {
    const condiciones = condicionesDocumento(); const copia = JSON.stringify(condiciones); const huella = hash(copia);
    assert.equal(condiciones.resumen.length, 4);
    assert.ok(condiciones.datos.length > condiciones.resumen[1].texto.length);
    assert.equal(condiciones.politica.huella, obtenerPoliticaDatos(env).huella);
    process.env.PRIVACY_EMAIL = "nuevo@example.com";
    assert.notEqual(condicionesDocumento().politica.huella, condiciones.politica.huella);
    assert.equal(hash(copia), huella); assert.equal(condiciones.politica.responsable.correo, env.PRIVACY_EMAIL);
  } finally { keys.forEach((k, i) => { if (prev[i] === undefined) delete process.env[k]; else process.env[k] = prev[i]; }); }
});
test("policy endpoint is public and handles missing company details without exposing config", async () => {
  const { default: app } = await import("../src/app.js");
  const keys = Object.keys(env); const prev = keys.map((k) => process.env[k]); keys.forEach((k) => { process.env[k] = env[k]; });
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/privacidad/politica`;
    const respuesta = await fetch(url); assert.equal(respuesta.status, 200);
    assert.equal((await respuesta.json()).data.responsable.nombre, env.LEGAL_COMPANY_NAME);
    delete process.env.LEGAL_COMPANY_NAME;
    const fallo = await fetch(url); assert.equal(fallo.status, 503); assert.match((await fallo.json()).message, /responsable/);
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); keys.forEach((k, i) => { if (prev[i] === undefined) delete process.env[k]; else process.env[k] = prev[i]; }); }
});
