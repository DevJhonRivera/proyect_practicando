import test from "node:test";
import assert from "node:assert/strict";
import { capturarEstado, registrarCambios } from "../src/modules/asesores/trazabilidad.utils.js";

test("records transitions and rework with server time and responsible user", () => {
  const orden = { flujo: { etapa: "EN_INSTALACION" }, auditoria: [{ usuarioNombre: "Ana" }], isModified: () => true };
  const antes = capturarEstado(orden);
  orden.flujo.etapa = "PENDIENTE_PAGO";
  const fecha = new Date("2026-11-03T15:00:00Z");
  registrarCambios(orden, antes, fecha);
  assert.equal(orden.trazabilidad.length, 1);
  assert.equal(orden.trazabilidad[0].anterior, "EN_INSTALACION");
  assert.equal(orden.trazabilidad[0].fecha, fecha);
  assert.equal(orden.trazabilidad[0].usuarioNombre, "Ana");
  const ultimo = capturarEstado(orden);
  orden.flujo.etapa = "EN_INSTALACION";
  registrarCambios(orden, ultimo, fecha);
  assert.equal(orden.trazabilidad.length, 2);
});

test("unchanged saves do not add events and assignments are measured independently", () => {
  const orden = { coordinacion: { asignaciones: [{ _id: "a", estado: "PENDIENTE" }, { _id: "b", estado: "EN_PROCESO" }] } };
  const antes = capturarEstado(orden);
  registrarCambios(orden, antes, new Date());
  assert.equal(orden.trazabilidad.length, 0);
  orden.coordinacion.asignaciones[1].estado = "COMPLETADA";
  registrarCambios(orden, antes, new Date());
  assert.equal(orden.trazabilidad.length, 1);
  assert.equal(orden.trazabilidad[0].proceso, "INSTALACION:b");
  assert.equal(orden.trazabilidad[0].usuarioNombre, "Sistema");
});


test("billing query updates append history without replacing earlier events", async () => {
  const { default: Asesoria } = await import("../src/modules/asesores/asesoria.model.js");
  const orden = Asesoria.hydrate({
    flujo: { etapa: "PENDIENTE_PAGO" }, pago: { estado: "PENDIENTE" },
    trazabilidad: [{ proceso: "SERVICIO", estado: "PENDIENTE_PAGO", fecha: new Date() }],
  });
  const query = Asesoria.findOneAndUpdate({ codigo: "TEST" }, {
    $set: { "pago.estado": "PAGADO", "flujo.etapa": "FINALIZADA" },
  });
  // Execute the real middleware against a controlled database read.
  query.model = { base: Asesoria.base, schema: Asesoria.schema, findOne: async () => orden };
  await Asesoria.schema.s.hooks.execPre("findOneAndUpdate", query, []);
  const update = query.getUpdate();
  assert.equal(update.$set["pago.estado"], "PAGADO");
  assert.equal(update.$push.trazabilidad.$each.length, 2);
  assert.equal(update.$push.trazabilidad.$each[0].anterior, "PENDIENTE_PAGO");
  assert.equal(update.$push.trazabilidad.$each[1].proceso, "PAGO");
  assert.equal(update.$push.trazabilidad.$each[1].estado, "PAGADO");
  assert.equal(update.$set.trazabilidad, undefined);
});


