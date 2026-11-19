import test from "node:test";
import assert from "node:assert/strict";

import {
  novedadesBloqueantes,
  recalcularComercial,
  validarSinNovedadesBloqueantes,
} from "../src/modules/asesores/asesoriaWorkflow.utils.js";

test("una falta de material pendiente o aprobada bloquea el flujo", () => {
  const asesoria = { novedades: [{ tipo: "FALTA_MATERIAL", estado: "APROBADA" }] };
  assert.equal(novedadesBloqueantes(asesoria).length, 1);
  assert.throws(() => validarSinNovedadesBloqueantes(asesoria), /FALTA MATERIAL/);
});

test("una novedad resuelta deja continuar el flujo", () => {
  const asesoria = { novedades: [{ tipo: "FALTA_MATERIAL", estado: "RESUELTA" }] };
  assert.equal(novedadesBloqueantes(asesoria).length, 0);
  assert.doesNotThrow(() => validarSinNovedadesBloqueantes(asesoria));
});

test("una repeticion de corte bloquea hasta consumir el nuevo material", () => {
  const pendiente = { novedades: [{ tipo: "REPETICION_CORTE", estado: "APROBADA" }] };
  assert.equal(novedadesBloqueantes(pendiente).length, 1);
  assert.throws(() => validarSinNovedadesBloqueantes(pendiente), /REPETICION CORTE/);

  pendiente.novedades[0].estado = "RESUELTA";
  assert.doesNotThrow(() => validarSinNovedadesBloqueantes(pendiente));
});

test("recalcula el total despues de retirar un servicio", () => {
  const comercial = recalcularComercial({
    polarizados: [{ valor: 500000 }],
    ppf: [{ valor: 800000 }],
    serviciosAdicionales: [],
    comercial: { descuento: 100000 },
  });
  assert.deepEqual(comercial, {
    valorVenta: 1300000,
    descuento: 100000,
    aplicaDescuento: true,
    totalAcordado: 1200000,
  });
});

test("limita el descuento al nuevo valor de la venta", () => {
  const comercial = recalcularComercial({
    polarizados: [{ valor: 200000 }],
    ppf: [],
    serviciosAdicionales: [],
    comercial: { descuento: 300000 },
  });
  assert.equal(comercial.descuento, 200000);
  assert.equal(comercial.totalAcordado, 0);
});

test("incluye accesorios en una cotizacion sin otros servicios", () => {
  const comercial = recalcularComercial({
    polarizados: [],
    ppf: [],
    serviciosAdicionales: [],
    accesorios: [{ cantidad: 2, precioUnitario: 120000, valor: 240000 }],
    comercial: { descuento: 40000 },
  });
  assert.deepEqual(comercial, {
    valorVenta: 240000,
    descuento: 40000,
    aplicaDescuento: true,
    totalAcordado: 200000,
  });
});

test("una garantia sin cobro conserva total cero", () => {
  const comercial = recalcularComercial({
    polarizados: [{ valor: 0 }],
    ppf: [{ valor: 0 }],
    serviciosAdicionales: [],
    accesorios: [{ cantidad: 1, precioUnitario: 0, valor: 0 }],
    comercial: { descuento: 0 },
  });
  assert.equal(comercial.valorVenta, 0);
  assert.equal(comercial.totalAcordado, 0);
});
