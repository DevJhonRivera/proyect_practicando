import test from "node:test";
import assert from "node:assert/strict";

import { validarAlcanceGarantia } from "../src/modules/asesores/asesor.service.js";

const origen = {
  polarizados: [{ material: "BLACK CERAMIC", porcentaje: "20%", partes: ["U", "PANORAMICO"] }],
  ppf: [{ referencia: "ROAD GUARD", piezas: ["CAPOT", "FAROLAS"] }],
  serviciosAdicionales: [{ tipo: "DETAILING", detalle: "CERAMICO 5 ANOS" }],
  accesorios: [{ accesorioId: "507f1f77bcf86cd799439011", cantidad: 2 }],
};

test("una garantia admite solo una parte del alcance original", () => {
  assert.doesNotThrow(() => validarAlcanceGarantia({
    polarizados: [{ material: "BLACK CERAMIC", porcentaje: "20%", partes: ["LUNETA"] }],
    ppf: [{ referencia: "ROAD GUARD", piezas: ["CAPOT"] }],
    serviciosAdicionales: [],
    accesoriosEntrada: [{ accesorioId: "507f1f77bcf86cd799439011", cantidad: 1 }],
  }, origen));
});

test("una mejora de material debe registrarse como servicio nuevo", () => {
  assert.throws(() => validarAlcanceGarantia({
    polarizados: [{ material: "CERAMIC I3 +", porcentaje: "15%", partes: ["LUNETA"] }],
  }, origen), /servicio nuevo vinculado/);
});

test("la garantia rechaza piezas, servicios y cantidades ajenas al original", () => {
  assert.throws(() => validarAlcanceGarantia({ ppf: [{ referencia: "ROAD GUARD", piezas: ["TECHO"] }] }, origen), /servicio nuevo/);
  assert.throws(() => validarAlcanceGarantia({ serviciosAdicionales: [{ tipo: "LAVADO", detalle: "PREMIUM" }] }, origen), /servicio nuevo/);
  assert.throws(() => validarAlcanceGarantia({ accesoriosEntrada: [{ accesorioId: "507f1f77bcf86cd799439011", cantidad: 3 }] }, origen), /servicio nuevo/);
});
