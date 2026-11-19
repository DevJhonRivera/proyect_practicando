import test from "node:test";
import assert from "node:assert/strict";
import { dividirGuardafango, subtotalesMedidasPpf } from "../../Front/src/utils/medidasPpf.js";

test("divide un guardafango con paral sin cobrar el rectángulo original y conserva lado y cantidad", () => {
  const pieza = "GUARDAFANGO TRASERO IZQUIERDO";
  const inicial = { piezas: [pieza, "CAPOT"], medidasPiezas: [{ pieza, anchoCm: 150, largoCm: 200, cantidad: 2 }, { pieza: "CAPOT", anchoCm: 100, largoCm: 100, cantidad: 1 }] };
  const dividido = dividirGuardafango(inicial, pieza);
  assert.equal(dividido.piezas.length, 3);
  assert.ok(!dividido.piezas.includes(pieza));
  assert.deepEqual(dividido.medidasPiezas.slice(0, 2).map((m) => [m.anchoCm, m.largoCm, m.cantidad]), [["", "", 2], ["", "", 2]]);
  dividido.medidasPiezas[0] = { ...dividido.medidasPiezas[0], anchoCm: 100, largoCm: 100 };
  dividido.medidasPiezas[1] = { ...dividido.medidasPiezas[1], anchoCm: 10, largoCm: 100 };
  assert.equal(subtotalesMedidasPpf({ ...dividido, valor: 320000 }).reduce((s, p) => s + p.areaM2, 0), 3.2);
  assert.equal(dividirGuardafango(dividido, dividido.piezas[0]), dividido);
  assert.equal(inicial.medidasPiezas[0].anchoCm, 150);
});

test("subtotales por área incluyen cantidad y cuadran con el precio redondeado", () => {
  const detalles = subtotalesMedidasPpf({ valor: 290000, medidasPiezas: [
    { pieza: "A", anchoCm: 100, largoCm: 100, cantidad: 2 },
    { pieza: "B", anchoCm: 100, largoCm: 100, cantidad: 1 },
    { pieza: "C", anchoCm: "", largoCm: 100, cantidad: 1 },
  ] });
  assert.deepEqual(detalles.map((d) => d.subtotal), [193333, 96667, 0]);
  assert.equal(detalles.reduce((s, d) => s + d.subtotal, 0), 290000);
  assert.equal(subtotalesMedidasPpf({ valor: 0, medidasPiezas: [] }).length, 0);
});
