import test from "node:test";
import assert from "node:assert/strict";

import {
  accionPredeterminada,
  tiposPermitidosPorRol,
} from "../src/modules/alertas/alerta.service.js";

test("distribuye alertas operativas solo al rol responsable", () => {
  assert.deepEqual(tiposPermitidosPorRol("SUPERUSUARIO"), []);
  assert.ok(tiposPermitidosPorRol("INVENTARIO").includes("RECEPCION_NUEVA"));
  assert.ok(tiposPermitidosPorRol("INVENTARIO").includes("ROLLO_BAJO"));
  assert.deepEqual(tiposPermitidosPorRol("INSTALADOR"), ["ASIGNACION_TRABAJO"]);
  assert.ok(tiposPermitidosPorRol("VENTAS").includes("SERVICIO_LISTO_PAGO"));
  assert.ok(!tiposPermitidosPorRol("VENTAS").includes("PROPUESTA_CORTE"));
});

test("administracion recibe solo solicitudes que requieren su intervencion", () => {
  const tipos = tiposPermitidosPorRol("ADMIN");
  assert.deepEqual(tipos, [
    "SOLICITUD_NOVEDAD",
    "SOLICITUD_GARANTIA",
    "ACCESORIO_PENDIENTE",
  ]);
});

test("repara destinos faltantes en alertas historicas", () => {
  const ordenId = "66f000000000000000000001";
  assert.equal(
    accionPredeterminada({ tipo: "SERVICIO_LISTO_PAGO", referenciaId: ordenId }),
    `/ventas?asesoria=${ordenId}`
  );
  assert.equal(
    accionPredeterminada({ tipo: "SOLICITUD_GARANTIA", referenciaId: ordenId }),
    `/asesores?asesoria=${ordenId}`
  );
  assert.equal(
    accionPredeterminada({ tipo: "RECEPCION_NUEVA" }),
    "/recepciones"
  );
  assert.equal(
    accionPredeterminada({ tipo: "ROLLO_BAJO" }),
    "/uso"
  );
  assert.equal(
    accionPredeterminada({ tipo: "OTRA", accionUrl: "/ruta-personalizada" }),
    "/ruta-personalizada"
  );
});
