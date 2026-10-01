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
