import test from "node:test";
import assert from "node:assert/strict";

import {
  prepararDetallePedido,
} from "../src/modules/pedidos/pedido.service.js";

test("normaliza una nueva referencia de pedido", () => {
  const detalle = prepararDetallePedido({
    tipoPolarizado: "  nueva referencia  ",
    porcentaje: "10",
    unidadMedida: "PORCENTAJE",
    ancho: "1.22",
    cantidadRollos: "2",
  });

  assert.equal(
    detalle.tipoPolarizado,
    "NUEVA REFERENCIA"
  );
  assert.equal(detalle.porcentaje, 10);
  assert.equal(detalle.ancho, 1.22);
  assert.equal(detalle.cantidadRollos, 2);
});

test("PPF se guarda sin clasificacion", () => {
  const detalle = prepararDetallePedido({
    tipoPolarizado: "PPF Especial",
    porcentaje: 500,
    unidadMedida: "NINGUNA",
    ancho: 1.52,
    cantidadRollos: 1,
  });

  assert.equal(detalle.porcentaje, 0);
  assert.equal(detalle.unidadMedida, "NINGUNA");
});

test("rechaza un ancho de material invalido", () => {
  assert.throws(
    () =>
      prepararDetallePedido({
        tipoPolarizado: "REFERENCIA",
        porcentaje: 20,
        unidadMedida: "PORCENTAJE",
        ancho: 0,
        cantidadRollos: 1,
      }),
    /ancho valido/i
  );
});
