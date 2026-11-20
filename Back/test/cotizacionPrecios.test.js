import test from "node:test";
import assert from "node:assert/strict";
import { calcularTarifasVenta } from "../src/modules/preciosVenta/calculoPrecios.mjs";
import { calcularTarifasVenta as vistaPrevia } from "../../Front/src/utils/preciosVenta.js";
import { aplicarPreciosAsesoria } from "../src/modules/preciosVenta/cotizacionPrecios.service.js";
import ListaPreciosVenta from "../src/modules/preciosVenta/precioVenta.model.js";
import ComboPpf from "../src/modules/combosPpf/comboPpf.model.js";
import Rollo from "../src/modules/rollos/rollo.model.js";
import Retazo from "../src/modules/retazos/retazo.model.js";
import { materialesDeTarifa, tarifaCompatibleConMaterial, tarifaCompatibleConPartes, tarifasCompatiblesConContexto } from "../src/modules/preciosVenta/materialTarifa.utils.js";
import { tarifaCompatibleConMaterial as compatibleVista, tarifaCompatibleConPartes as partesVista } from "../../Front/src/utils/preciosVenta.js";
import { seleccionarTarifaVenta } from "../../Front/src/utils/preciosVenta.js";

const fila = (codigo, precios, modalidad = "FIJO") => ({ codigo, precios, modalidad, activo: true, requiereRevision: false, revision: 0, grupo: codigo, descripcion: "SUV", materiales: codigo === "PPF" ? ["PPF"] : ["PELICULA:700"], condiciones: precios.map(() => "Transferencia") });
const lista = [fila("700MICRAS", [3199900,3150000]), fila("PPF", [13500000,13000000]), fila("PIEZA", [40], "PORCENTAJE")];
const ref = (codigo, nivel = 1) => ({ codigo, nivel, revision: 0, cantidad: 1 });

test("una tarifa por pieza completa su base vigente y explica cuando falta el precio completo", () => {
  const seleccion = seleccionarTarifaVenta("PIEZA", lista, [lista[0]]);
  assert.equal(seleccion.baseCodigo, "700MICRAS");
  assert.equal(seleccion.baseNivel, 0);
  assert.equal(vistaPrevia([seleccion], lista).total, 1279960);
  const pendiente = { ...lista[0], requiereRevision: true };
  const sinBase = seleccionarTarifaVenta("PIEZA", lista, [pendiente]);
  assert.equal(sinBase.baseCodigo, undefined);
  assert.throws(() => vistaPrevia([sinBase], lista), /precio completo/);
});

test("cotiza película y PPF desde Administración y calcula piezas por porcentaje", () => {
  assert.equal(calcularTarifasVenta([ref("700MICRAS"), ref("PPF")], lista).total, 16150000);
  assert.equal(vistaPrevia([ref("700MICRAS"), ref("PPF")], lista).total, 16150000);
  const piezas = calcularTarifasVenta([{ ...ref("PIEZA", 0), cantidad: 2, baseCodigo: "700MICRAS", baseNivel: 0, baseRevision: 0 }], lista);
  assert.equal(piezas.total, 2559920);
  assert.equal(vistaPrevia([{ ...ref("PIEZA", 0), cantidad: 2, baseCodigo: "700MICRAS", baseNivel: 0, baseRevision: 0 }], lista).total, piezas.total);
  assert.equal(piezas.tarifas[0].baseValor, 3199900);
  assert.throws(() => calcularTarifasVenta([{ ...ref("PPF"), revision: 1 }], lista), /actualizó/);
  assert.throws(() => calcularTarifasVenta([ref("PIEZA", 0)], lista), /vigente/);
  assert.throws(() => calcularTarifasVenta([ref("PPF")], [{ ...lista[1], activo: false }]), /vigente/);
});

test("el backend recalcula los importes y rechaza servicios nuevos sin tarifa", async (t) => {
  t.mock.method(ListaPreciosVenta, "updateOne", async () => ({}));
  t.mock.method(ListaPreciosVenta, "findById", () => ({ lean: async () => ({ filas: lista }) }));
  const servicio = { material: "PELICULA", porcentaje: "700 MICRAS", partes: ["COMPLETO"], valor: 1, tarifasVenta: [ref("700MICRAS")] };
  const orden = await aplicarPreciosAsesoria({ polarizados: [servicio] });
  assert.equal(orden.polarizados[0].valor, 3150000);
  assert.equal(orden.polarizados[0].tarifasVenta[0].condicion, "Transferencia");
  await assert.rejects(aplicarPreciosAsesoria({ polarizados: [{ ...servicio, tarifasVenta: [] }] }), /Seleccione la tarifa/);
  await assert.rejects(aplicarPreciosAsesoria({ polarizados: [{ ...servicio, tarifasVenta: [ref("PPF")] }] }), /no corresponde/);
});

test("filtra Black Ceramic, I3 y película por material y micraje", () => {
  const grupos = ["BLACK CERAMIC / PRO HD BLINDADOS", "CERAMIC I3 / ULTRA OPTIK BLINDADOS", "CERAMIC I3 +", "NANOCERÁMICA"];
  const tarifas = grupos.map((grupo) => ({ hoja: "POLARIZADOS", grupo, descripcion: "AUTOMÓVIL ESTÁNDAR" }));
  assert.deepEqual(tarifas.filter((item) => tarifaCompatibleConMaterial(item, "BLACK CERAMIC")).map((item) => item.grupo), [grupos[0]]);
  for (const item of tarifas) {
    assert.equal(compatibleVista({ ...item, materiales: materialesDeTarifa(item) }, "BLACK CERAMIC"), tarifaCompatibleConMaterial(item, "BLACK CERAMIC"));
  }
  assert.equal(tarifaCompatibleConMaterial(tarifas[2], "CERAMIC I3"), false);
  const pelicula = { hoja: "ANTIATRACO", grupo: "NIVEL 4 (700 MICRAS) + NANO", descripcion: "CAMIONETA" };
  assert.equal(tarifaCompatibleConMaterial(pelicula, "PELICULA", "700 MICRAS"), true);
  assert.equal(tarifaCompatibleConMaterial(pelicula, "PELICULA", "300 MICRAS"), false);
  const personalizada = { hoja: "OTRA", grupo: "Mi tarifa", materiales: ["BLACK CERAMIC"] };
  assert.equal(tarifaCompatibleConMaterial(personalizada, "BLACK CERAMIC"), true);
});

test("filtra las tarifas por pieza según las partes seleccionadas del vehículo", () => {
  const tarifas = [
    { modalidad: "FIJO", descripcion: "AUTOMOVIL" },
    { modalidad: "PORCENTAJE", descripcion: "PANORAMICO" },
    { modalidad: "PORCENTAJE", descripcion: "VENTANA DELANTERA UNIDAD" },
    { modalidad: "PORCENTAJE", descripcion: "VENTANA TRASERA UNIDAD" },
    { modalidad: "PORCENTAJE", descripcion: "PARABRISAS Y LUNETA" },
    { modalidad: "PORCENTAJE", descripcion: "LA U" },
  ];
  const compatibles = (partes) => tarifas.filter((tarifa) => tarifaCompatibleConPartes(tarifa, partes)).map((tarifa) => tarifa.descripcion);
  assert.deepEqual(compatibles(["PANORAMICO"]), ["AUTOMOVIL", "PANORAMICO"]);
  assert.deepEqual(compatibles(["DELANTERAS"]), ["AUTOMOVIL", "VENTANA DELANTERA UNIDAD"]);
  assert.deepEqual(compatibles(["PANORAMICO", "LUNETA"]), ["AUTOMOVIL", "PANORAMICO", "PARABRISAS Y LUNETA"]);
  assert.deepEqual(compatibles(["U"]), ["AUTOMOVIL", "VENTANA DELANTERA UNIDAD", "VENTANA TRASERA UNIDAD", "LA U"]);
  assert.deepEqual(compatibles(["COMPLETO"]), ["AUTOMOVIL"]);
  for (const tarifa of tarifas) assert.equal(partesVista(tarifa, ["LUNETA"]), tarifaCompatibleConPartes(tarifa, ["LUNETA"]));
});

test("una edición de datos conserva el precio histórico y un nuevo servicio requiere tarifa", async () => {
  const anterior = { polarizados: [{ material: "BLACK CERAMIC", porcentaje: "20%", partes: ["COMPLETO"], valor: 450000 }] };
  const data = { polarizados: [{ ...anterior.polarizados[0], valor: 1 }] };
  assert.equal((await aplicarPreciosAsesoria(data, anterior)).polarizados[0].valor, 450000);
  anterior.polarizados.push({ ...anterior.polarizados[0], valor: 550000 });
  const repetidas = await aplicarPreciosAsesoria({ polarizados: anterior.polarizados.map((item) => ({ ...item, valor: 1 })) }, anterior);
  assert.deepEqual(repetidas.polarizados.map((item) => item.valor), [450000, 550000]);
});

test("filtra tarifas por servicio, asegurada y categoría de accesorio", () => {
  const tarifas = [
    { codigo: "asegurada", hoja: "ACCESORIOS 2", grupo: "ASEGURADA GENERAL", descripcion: "ASEGURADA GENERAL" },
    { codigo: "tapete", hoja: "TAPETES", grupo: "TAPETES DEFENDER", descripcion: "TESLA MODEL Y" },
    { codigo: "ceramico", hoja: "DETAILING", grupo: "TRATAMIENTO CERÁMICO", descripcion: "CERÁMICO 5 AÑOS" },
    { codigo: "ppf", hoja: "PPF", grupo: "PPF GENERAL", descripcion: "CAMIONETA" },
  ];
  assert.deepEqual(tarifasCompatiblesConContexto(tarifas, "SERVICIO", "ASEGURADA", "ASEGURADA GENERAL").map((fila) => fila.codigo), ["asegurada"]);
  assert.deepEqual(tarifasCompatiblesConContexto(tarifas, "SERVICIO", "DETAILING", "CERÁMICO 5 AÑOS").map((fila) => fila.codigo), ["ceramico"]);
  assert.deepEqual(tarifasCompatiblesConContexto(tarifas, "ACCESORIO", "TAPETES", "TAPETES DEFENDER TESLA MODEL Y").map((fila) => fila.codigo), ["tapete"]);
});

test("una moto PPF solo admite una tarifa base configurada para moto", async (t) => {
  const tarifas = [
    { ...fila("PPF-CARRO", [1500000]), descripcion: "AUTOMOVIL / SUV", materiales: ["PPF"] },
    { ...fila("PPF-MOTO", [650000]), descripcion: "MOTO", materiales: ["PPF"] },
  ];
  t.mock.method(ListaPreciosVenta, "updateOne", async () => ({}));
  t.mock.method(ListaPreciosVenta, "findById", () => ({ lean: async () => ({ filas: tarifas }) }));
  const servicio = { referencia: "ROAD GUARD", aplicacion: "EXTERIOR", piezas: ["TANQUE"], tarifasVenta: [ref("PPF-CARRO", 0)] };

  await assert.rejects(
    aplicarPreciosAsesoria({ vehiculo: { tipo: "MOTO" }, ppf: [servicio] }),
    /configurada para moto/
  );
  const orden = await aplicarPreciosAsesoria({
    vehiculo: { tipo: "MOTO" },
    ppf: [{ ...servicio, tarifasVenta: [ref("PPF-MOTO", 0)] }],
  });
  assert.equal(orden.ppf[0].valor, 650000);
});

test("un combo PPF compartido recalcula precio y piezas desde el catálogo", async (t) => {
  const combo = {
    _id: "64b000000000000000000001", nombre: "COMBO EXTERIOR", tipoVehiculo: "CARRO",
    marca: "", modelo: "", referenciasPpf: ["ROAD GUARD"],
    piezas: ["PARALES", "MANIJAS", "FAROLAS", "STOPS"],
    precioIndividual: 980000, precioCombo: 600000, precioMinimo: 570000,
    permiteDescuento: true, descuentoMaximoPorcentaje: 5,
  };
  t.mock.method(ComboPpf, "findOne", () => ({ lean: async () => combo }));
  const orden = await aplicarPreciosAsesoria({
    vehiculo: { tipo: "CARRO", marca: "TESLA", modelo: "MODEL Y" },
    ppf: [{ comboPpfId: combo._id, referencia: "ROAD GUARD", aplicacion: "EXTERIOR", piezas: ["DATO MANIPULADO"] }],
  });
  assert.equal(orden.ppf[0].valor, 600000);
  assert.deepEqual(orden.ppf[0].piezas, combo.piezas);
  assert.equal(orden.ppf[0].comboPrecioMinimo, 570000);
});

test("una pieza PPF grande se cotiza por área, margen técnico y dificultad", async (t) => {
  const consulta = (items) => ({ select: () => ({ lean: async () => items }) });
  t.mock.method(Rollo, "find", () => consulta([{ tipoPolarizado: "PPF - ROAD GUARD", ancho: 1.52, largoDisponible: 15.24, costoPorMetroCop: 196850 }]));
  t.mock.method(Retazo, "find", () => consulta([]));
  const orden = await aplicarPreciosAsesoria({
    vehiculo: { tipo: "MOTO" },
    ppf: [{ referencia: "ROAD GUARD", aplicacion: "EXTERIOR", piezas: ["TANQUE"], cotizacionModo: "MEDIDAS",
      medidasPiezas: [{ pieza: "TANQUE", anchoCm: 110, largoCm: 210, cantidad: 1 }],
      dificultad: "MEDIA" }],
  });
  assert.equal(orden.ppf[0].areaRealM2, 2.31);
  assert.equal(orden.ppf[0].areaFacturableM2, 2.31);
  assert.equal(orden.ppf[0].costoPromedioM2, 129507);
  assert.equal(orden.ppf[0].valor, 997000);
});
