import test from "node:test";
import assert from "node:assert/strict";
import { precargarMedidasPpf } from "../../Front/src/utils/medidasCoordinacion.js";

const linea = { linea: "PPF 1", partes: ["GUARDAFANGO - SECCION ANCHA", "GUARDAFANGO - TIRA DEL PARAL"] };
const orden = { vehiculo: { tipo: "CARRO", marca: "TESLA", modelo: "MODEL Y", anio: "2026" }, ppf: [{ aplicacion: "EXTERIOR", medidasPiezas: [
  { pieza: linea.partes[0], anchoCm: 110, largoCm: 80, cantidad: 1 },
  { pieza: linea.partes[1], anchoCm: 12, largoCm: 150, cantidad: 2 },
] }] };
test("precarga medidas y secciones del asesor sin reemplazar ajustes de coordinación", () => {
  const medidas = precargarMedidasPpf(linea, orden);
  assert.deepEqual(medidas.map((m) => [m.anchoCm, m.largoCm, m.cantidad]), [[110, 80, 1], [12, 150, 2]]);
  assert.match(medidas[0].origenMedida, /Asesor/);
  const actual = { medidasPiezas: [{ pieza: linea.partes[0], anchoCm: 120, largoCm: 90, cantidad: 1 }] };
  const corregidas = precargarMedidasPpf(linea, orden, [], actual);
  assert.equal(corregidas[0].anchoCm, 120);
  assert.equal(corregidas[1].anchoCm, 12);
});
test("catálogo solo completa faltantes del mismo vehículo, año y zona", () => {
  const sinMedidas = { ...orden, ppf: [{ aplicacion: "EXTERIOR" }] };
  const catalogada = { ...orden.vehiculo, tipoVehiculo: "CARRO", ubicacion: "EXTERIOR", pieza: linea.partes[0], anchoCm: 100, largoCm: 75, cantidad: 1 };
  const catalogo = [{ ...catalogada, anio: "2025", anchoCm: 999 }, { ...catalogada, ubicacion: "INTERIOR", anchoCm: 888 }, catalogada];
  const medidas = precargarMedidasPpf(linea, sinMedidas, catalogo);
  assert.equal(medidas[0].anchoCm, 100);
  assert.match(medidas[0].origenMedida, /catálogo/);
  assert.equal(medidas[1].anchoCm, "");
  assert.equal(precargarMedidasPpf(linea, orden, catalogo)[0].anchoCm, 110);
  assert.equal(precargarMedidasPpf(linea, sinMedidas, [{ ...catalogada, modelo: "MODEL 3" }])[0].anchoCm, "");
});
