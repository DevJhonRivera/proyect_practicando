import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../src/modules/users/user.model.js";
import eventosRoutes from "../src/modules/tiempoReal/eventos.routes.js";
import { avisarCambioAlertas, estaEnLinea, notificarUsuarios } from "../src/modules/tiempoReal/canales.js";

test("la conexión autenticada entrega eventos privados y avisos sin recarga", async (t) => {
  const anterior = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "secreto-ficticio-tiempo-real";
  const uno = "507f1f77bcf86cd799439011";
  const dos = "507f1f77bcf86cd799439012";
  t.mock.method(User, "findById", (id) => ({ select: async () => ({ _id: id, rol: "VENTAS", tokenVersion: 0 }) }));
  const app = express();
  const cierres = [];
  app.use((req, res, next) => {
    if (req.headers.authorization) cierres.push(new Promise((resolve) => res.once("close", resolve)));
    next();
  });
  app.use("/eventos", eventosRoutes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}/eventos`;
  const conexiones = [];
  async function conectar(id) {
    const control = new AbortController();
    conexiones.push(control);
    const respuesta = await fetch(url, {
      headers: { Authorization: `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}` },
      signal: AbortSignal.any([control.signal, AbortSignal.timeout(5000)]),
    });
    assert.equal(respuesta.status, 200);
    assert.match(respuesta.headers.get("content-type"), /text\/event-stream/);
    const lector = respuesta.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    return async () => {
      while (!buffer.includes("\n\n")) {
        const { done, value } = await lector.read();
        assert.equal(done, false);
        buffer += decoder.decode(value, { stream: true });
      }
      const fin = buffer.indexOf("\n\n");
      const evento = buffer.slice(0, fin);
      buffer = buffer.slice(fin + 2);
      return evento;
    };
  }
  try {
    assert.equal((await fetch(url)).status, 401);
    const leerUno = await conectar(uno);
    const leerDos = await conectar(dos);
    assert.match(await leerUno(), /^event: conectado/);
    assert.match(await leerDos(), /^event: conectado/);
    assert.ok(estaEnLinea(uno) && estaEnLinea(dos));
    notificarUsuarios([uno], "chat", { conversacion: "privada" });
    notificarUsuarios([uno], "escribiendo", { escribiendo: true });
    avisarCambioAlertas();
    assert.match(await leerUno(), /^event: chat\ndata: \{"conversacion":"privada"\}/);
    assert.match(await leerUno(), /^event: escribiendo/);
    assert.equal(await leerUno(), "event: alertas\ndata: {}");
    assert.equal(await leerDos(), "event: alertas\ndata: {}");
  } finally {
    conexiones.forEach((control) => control.abort());
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await Promise.all(cierres);
    if (anterior === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = anterior;
  }
  assert.equal(estaEnLinea(uno), false);
  assert.equal(estaEnLinea(dos), false);
});
