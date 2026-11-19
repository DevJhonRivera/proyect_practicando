import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calcularPiezasPpf } from "../src/modules/preciosVenta/calculoPrecios.mjs";
import { aplicarPreciosAsesoria } from "../src/modules/preciosVenta/cotizacionPrecios.service.js";
import Lista from "../src/modules/preciosVenta/precioVenta.model.js";
import { asegurarListaPrecios } from "../src/modules/preciosVenta/precioVenta.service.js";

const precios = JSON.parse(readFileSync(new URL("../src/modules/preciosVenta/piezasPpfIniciales.json", import.meta.url)));
test("retira tarifas PPF antiguas sin tocar piezas estándar ni nuevos precios", async (t) => {
  let retirada;
  t.mock.method(Lista, "updateOne", async (filtro, update) => {
    if (update.$pull) retirada = { filtro, update };
    return {};
  });
  await asegurarListaPrecios();
  assert.equal(retirada.filtro.tarifasPpfRetiradasVersion.$ne, 1);
  const codigos = retirada.update.$pull.filas.codigo.$in;
  assert.equal(codigos.length, 28);
  assert.ok(codigos.includes("EXCEL2026-12-10"));
  assert.ok(!codigos.includes("EXCEL2026-13-10"));
  assert.ok(precios.every((p) => !codigos.includes(p.codigo)));
});
test("precios estándar respetan referencia por par y no multiplican dos veces la presentación", () => {
  assert.equal(new Set(precios.map((p) => p.descripcion)).size, precios.length);
  assert.equal(new Set(precios.map((p) => p.codigo)).size, precios.length);
  assert.equal(calcularPiezasPpf(["RETROVISORES X2"], precios).total, 290000);
  const pantalla = precios.find((p) => p.descripcion === "PANTALLA MEDIANO");
  assert.equal(calcularPiezasPpf(["RETROVISORES X2", pantalla.descripcion], precios).total, 290000 + pantalla.precios[0]);
  assert.throws(() => calcularPiezasPpf(["INEXISTENTE"], precios), /pendiente/);
  assert.throws(() => calcularPiezasPpf(["RETROVISORES X2"], precios.map((p) => ({ ...p, activo: false }))), /pendiente/);
  assert.throws(() => calcularPiezasPpf(["RETROVISORES X2", "RETROVISORES X2"], precios), /duplicados/);
});

test("carga inicial ocurre una sola vez y no repone piezas eliminadas o editadas", async (t) => {
  let version;
  let filas = [];
  t.mock.method(Lista, "updateOne", async (filtro, update) => {
    if (update.$push && version !== filtro.piezasPpfVersion.$ne) {
      filas.push(...structuredClone(update.$push.filas.$each));
      version = update.$set.piezasPpfVersion;
    }
    return {};
  });
  await asegurarListaPrecios();
  filas = filas.filter((p) => p.descripcion !== "RETROVISORES X2");
  filas[0].precios[0] = 123000;
  await asegurarListaPrecios();
  assert.equal(filas.length, precios.length - 1);
  assert.equal(filas[0].precios[0], 123000);
  assert.ok(!filas.some((p) => p.descripcion === "RETROVISORES X2"));
});

test("servidor calcula piezas estándar, conserva histórico y no exige costo del rollo", async (t) => {
  t.mock.method(Lista, "updateOne", async () => ({}));
  t.mock.method(Lista, "findById", () => ({ lean: async () => ({ filas: precios }) }));
  const datos = { ppf: [{ referencia: "PPF", aplicacion: "EXTERIOR", cotizacionModo: "PIEZAS", piezas: ["RETROVISORES X2"], valor: 1 }] };
  const calculado = await aplicarPreciosAsesoria(datos);
  assert.equal(calculado.ppf[0].valor, 290000);
  const antiguo = structuredClone(calculado);
  antiguo.ppf[0].valor = 250000;
  assert.equal((await aplicarPreciosAsesoria(calculado, antiguo)).ppf[0].valor, 250000);
  await assert.rejects(aplicarPreciosAsesoria({ ppf: [{ ...datos.ppf[0], piezas: ["SIN PRECIO"] }] }), /pendiente/);
  assert.equal((await aplicarPreciosAsesoria({ ...datos, garantia: { esGarantia: true } })).ppf[0].valor, 1);
});
