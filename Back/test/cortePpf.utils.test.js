import test from "node:test";
import assert from "node:assert/strict";

import {
  prepararPiezasPpf,
} from "../src/modules/cortes/cortePpf.utils.js";

test("un corte PPF admite varias piezas", () => {
  const piezas = prepararPiezasPpf([
    {
      pieza: "Capot",
      ubicacion: "EXTERIOR",
      anchoCm: 140,
      largoCm: 100,
      cantidad: 1,
    },
    {
      pieza: "Retrovisor",
      ubicacion: "EXTERIOR",
      anchoCm: 30,
      largoCm: 20,
      cantidad: 2,
      rotada: true,
    },
  ]);

  assert.equal(piezas.length, 2);
  assert.equal(piezas[0].pieza, "CAPOT");
  assert.equal(piezas[1].cantidad, 2);
});
