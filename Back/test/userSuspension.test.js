import assert from "node:assert/strict";
import test from "node:test";

import {
  suspensionEstaActiva,
  suspensionEstaVencida,
} from "../src/modules/users/userSuspension.js";

const ahora = new Date("2026-09-26T12:00:00.000Z");

test("reconoce una suspension indefinida", () => {
  const user = {
    suspendido: true,
    suspensionIndefinida: true,
    suspendidoHasta: null,
  };

  assert.equal(suspensionEstaActiva(user, ahora), true);
  assert.equal(suspensionEstaVencida(user, ahora), false);
});

test("mantiene activa una suspension temporal futura", () => {
  const user = {
    suspendido: true,
    suspensionIndefinida: false,
    suspendidoHasta: "2026-09-27T12:00:00.000Z",
  };

  assert.equal(suspensionEstaActiva(user, ahora), true);
  assert.equal(suspensionEstaVencida(user, ahora), false);
});

test("detecta una suspension temporal vencida", () => {
  const user = {
    suspendido: true,
    suspensionIndefinida: false,
    suspendidoHasta: "2026-09-25T12:00:00.000Z",
  };

  assert.equal(suspensionEstaActiva(user, ahora), false);
  assert.equal(suspensionEstaVencida(user, ahora), true);
});
