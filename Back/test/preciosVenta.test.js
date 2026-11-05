import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ListaPreciosVenta from "../src/modules/preciosVenta/precioVenta.model.js";
import { asegurarListaPrecios, guardarPrecioVenta, listarPreciosVenta, prepararPrecioVenta } from "../src/modules/preciosVenta/precioVenta.service.js";

const iniciales = JSON.parse(readFileSync(new URL("../src/modules/preciosVenta/preciosIniciales.json", import.meta.url), "utf8"));
const usuario = { nombre: "Administrador de prueba", rol: "ADMIN" };

test("la carga conserva las trece hojas, pesos, porcentajes y precios pendientes", async () => {
  assert.equal(iniciales.length, 207);
  assert.equal(new Set(iniciales.map((fila) => fila.hoja)).size, 13);
  assert.equal(new Set(iniciales.map((fila) => fila.codigo)).size, iniciales.length);
  const pieza = iniciales.find((fila) => fila.codigo === "EXCEL2026-3-17");
  assert.equal(pieza.modalidad, "PORCENTAJE");
  assert.deepEqual(pieza.precios, [40,38,36,34]);
  const ambiguo = iniciales.find((fila) => fila.codigo === "EXCEL2026-1-18");
  assert.equal(ambiguo.precios[0], null);
  assert.equal(ambiguo.originales[0], "529.900 + 30.000");
  assert.equal(ambiguo.requiereRevision, true);
  assert.ok(iniciales.filter((fila) => fila.hoja === "POLARIZADOS (2)").every((fila) => !fila.activo && fila.requiereRevision));
  await new ListaPreciosVenta({ _id: "vigente", filas: iniciales }).validate();
});

test("valida los niveles y distingue precio no disponible de cero", () => {
  const entrada = { ...iniciales[0], precios: [429900,null,0], condiciones: ["Lista", "", "Sin cobro"] };
  assert.deepEqual(prepararPrecioVenta(entrada).precios, [429900,null,0]);
  for (const precio of [-1, 1.5, Infinity, true, " ", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => prepararPrecioVenta({ ...entrada, precios: [precio], condiciones: [""] }));
  }
  assert.throws(() => prepararPrecioVenta({ ...entrada, modalidad: "PORCENTAJE", precios: [101], condiciones: [""] }));
  assert.throws(() => prepararPrecioVenta({ ...entrada, precios: [null], condiciones: [""] }));
});

test("una edición persiste al consultar y una versión anterior no puede sobrescribirla", async (t) => {
  const fila = structuredClone(iniciales[0]);
  t.mock.method(ListaPreciosVenta, "updateOne", async (_query, update) => {
    assert.deepEqual(update.$setOnInsert.filas, iniciales);
    assert.equal(update.$set, undefined);
  });
  t.mock.method(ListaPreciosVenta, "findById", () => ({ lean: async () => ({ filas: [fila, iniciales.find((item) => item.requiereRevision)] }) }));
  t.mock.method(ListaPreciosVenta, "findOneAndUpdate", (query, update) => ({ lean: async () => {
    assert.equal(query.filas.$elemMatch.codigo, fila.codigo);
    if (query.filas.$elemMatch.revision !== fila.revision) return null;
    for (const [clave, valor] of Object.entries(update.$set)) fila[clave.replace("filas.$.", "")] = valor;
    fila.revision += update.$inc["filas.$.revision"];
    return { filas: [fila] };
  } }));
  const modificada = { ...fila, precios: [450000,430000,410000,400000] };
  const guardada = await guardarPrecioVenta(fila.codigo, modificada, usuario);
  assert.equal(guardada.revision, 1);
  assert.equal(guardada.actualizadoPor, usuario.nombre);
  await asegurarListaPrecios();
  const vigentes = await listarPreciosVenta(false);
  assert.equal(vigentes.length, 1);
  assert.deepEqual(vigentes[0].precios, modificada.precios);
  await assert.rejects(guardarPrecioVenta(fila.codigo, modificada, usuario), (error) => error.status === 409);
});
