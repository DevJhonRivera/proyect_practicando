import test from "node:test";
import assert from "node:assert/strict";
import PiezaPpf from "../src/modules/piezasPpf/piezaPpf.model.js";
import { sincronizarPiezasDesdeAsesoria } from "../src/modules/piezasPpf/piezaPpf.service.js";

test("conserva zona interior y cantidades de las piezas seleccionadas", async (t) => {
  let operaciones = [];
  t.mock.method(PiezaPpf, "bulkWrite", async (recibidas) => { operaciones = recibidas; });
  await sincronizarPiezasDesdeAsesoria({
    vehiculo: { tipo: "CARRO", marca: "TESLA", modelo: "MODEL Y", anio: "2026" },
    ppf: [{ cotizacionModo: "MEDIDAS", aplicacion: "COMPLETO", medidasPiezas: [
      { pieza: "PANTALLA MEDIANO", ubicacion: "INTERIOR", anchoCm: 30, largoCm: 20, cantidad: 1 },
      { pieza: "PARALES X6", ubicacion: "EXTERIOR", anchoCm: 10, largoCm: 40, cantidad: 6 },
    ] }, { cotizacionModo: "MEDIDAS", aplicacion: "INTERIOR", medidasPiezas: [
      { pieza: "CONSOLA CENTRAL", anchoCm: 20, largoCm: 35, cantidad: 1 },
    ] }],
  }, { nombre: "ASESOR" });
  assert.deepEqual(operaciones.map((o) => o.updateOne.update.$set.ubicacion), ["INTERIOR", "EXTERIOR", "INTERIOR"]);
  assert.equal(operaciones[1].updateOne.update.$set.cantidad, 6);
});

test("las medidas PPF de una cotización alimentan el catálogo del mismo vehículo", async (t) => {
  let operaciones = [];
  t.mock.method(PiezaPpf, "bulkWrite", async (recibidas) => { operaciones = recibidas; });
  const cantidad = await sincronizarPiezasDesdeAsesoria({
    _id: "64b000000000000000000010",
    vehiculo: { tipo: "MOTO", marca: "BMW", modelo: "R 1250", anio: "2026" },
    ppf: [{ cotizacionModo: "MEDIDAS", medidasPiezas: [
      { pieza: "TANQUE", anchoCm: 45, largoCm: 70, cantidad: 1 },
      { pieza: "FAROLA", anchoCm: 0, largoCm: 20, cantidad: 1 },
    ] }],
  }, { nombre: "ASESOR UNO" });
  assert.equal(cantidad, 1);
  assert.equal(operaciones[0].updateOne.update.$set.tipoVehiculo, "MOTO");
  assert.equal(operaciones[0].updateOne.update.$set.pieza, "TANQUE");
  assert.equal(operaciones[0].updateOne.update.$set.anchoCm, 45);
  assert.equal(operaciones[0].updateOne.update.$set.actualizadoPorNombre, "ASESOR UNO");
});
