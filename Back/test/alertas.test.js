import test from "node:test";
import assert from "node:assert/strict";
import router from "../src/modules/alertas/alerta.routes.js";
import Alerta from "../src/modules/alertas/alerta.model.js";
import RolePermission from "../src/modules/roles/rolePermission.model.js";

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

test("cada perfil puede atender las alertas de su bandeja, incluidas las de solo lectura", async (t) => {
  const ruta = router.stack.find(({ route }) => route?.path === "/:id/atender").route;
  const [, permiso, atender] = ruta.stack.map(({ handle }) => handle);
  const usuarioId = "66f000000000000000000001";
  const alertaId = "66f000000000000000000002";
  let alerta;
  t.mock.method(RolePermission, "findOne", async ({ rol }) =>
    rol === "VENTAS" ? { permisos: ["alertas:read"] } : null);
  t.mock.method(Alerta, "findOneAndUpdate", async (filtro, cambios) => {
    const visible = filtro._id === alertaId && filtro.$or.some(({ tipo, destinatarioId }) =>
      tipo.$in.includes(alerta.tipo) && (!destinatarioId || destinatarioId === alerta.destinatarioId));
    return visible ? Object.assign(alerta, cambios) : null;
  });

  const ejecutar = async (rol, tipo, destinatarioId = usuarioId) => {
    alerta = { tipo, destinatarioId };
    const req = { params: { id: alertaId }, user: { rol, _id: usuarioId } };
    const res = {
      codigo: 200,
      status(codigo) { this.codigo = codigo; return this; },
      json() {},
    };
    let respuesta;
    await permiso(req, res, () => { respuesta = atender(req, res); });
    await respuesta;
    assert.equal(alerta.atendida === true, res.codigo === 200);
    return res.codigo;
  };

  for (const [rol, tipo] of [
    ["INSTALADOR", "ASIGNACION_TRABAJO"],
    ["ASESOR", "FIRMA_CLIENTE"],
    ["VENTAS", "SERVICIO_LISTO_PAGO"],
    ["COORDINADOR", "COORDINACION_NUEVA"],
    ["INVENTARIO", "ROLLO_BAJO"],
    ["ADMIN", "SOLICITUD_GARANTIA"],
    ["SUPERUSUARIO", "RESPUESTA_CLIENTE"],
  ]) assert.equal(await ejecutar(rol, tipo), 200, rol);
  assert.equal(await ejecutar("INSTALADOR", "ASIGNACION_TRABAJO", alertaId), 404);
  assert.equal(await ejecutar("ASESOR", "FIRMA_CLIENTE", alertaId), 404);
  assert.equal(await ejecutar("VENTAS", "ASIGNACION_TRABAJO"), 404);
  assert.equal(await ejecutar("SIN_PERMISOS", "FIRMA_CLIENTE"), 403);
});
