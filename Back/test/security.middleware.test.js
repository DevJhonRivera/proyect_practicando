import test from "node:test";
import assert from "node:assert/strict";

import {
  limpiarIntentosLogin,
  loginRateLimiter,
  registrarLoginFallido,
} from "../src/middlewares/security.middleware.js";

const crearPeticion = (correo) => ({
  ip: "127.0.0.50",
  headers: {},
  body: { correo },
});

const crearRespuesta = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("bloquea temporalmente despues de diez fallos", () => {
  const req = crearPeticion(
    "prueba-limite@polarizadosya.test"
  );

  for (let index = 0; index < 10; index += 1) {
    registrarLoginFallido(req);
  }

  const res = crearRespuesta();
  let continuo = false;

  loginRateLimiter(req, res, () => {
    continuo = true;
  });

  assert.equal(continuo, false);
  assert.equal(res.statusCode, 429);
  assert.ok(res.body.retryAfterSeconds > 0);

  limpiarIntentosLogin(req);
});

test("un inicio exitoso limpia los intentos fallidos", () => {
  const req = crearPeticion(
    "prueba-limpieza@polarizadosya.test"
  );

  registrarLoginFallido(req);
  limpiarIntentosLogin(req);

  const res = crearRespuesta();
  let continuo = false;

  loginRateLimiter(req, res, () => {
    continuo = true;
  });

  assert.equal(continuo, true);
  assert.equal(res.statusCode, 200);
});
