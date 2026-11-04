import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import chatRoutes from "../src/modules/chat/chat.routes.js";
import { Conversacion, Mensaje } from "../src/modules/chat/chat.model.js";
import { alcanceOrdenChat, claveConversacion, puedeIniciarChat, puedenConversar } from "../src/modules/chat/chat.utils.js";
import User from "../src/modules/users/user.model.js";
import Asesoria from "../src/modules/asesores/asesoria.model.js";

const ids = {
  asesor: "507f1f77bcf86cd799439011",
  coordinador: "507f1f77bcf86cd799439012",
  instalador: "507f1f77bcf86cd799439013",
  orden: "507f1f77bcf86cd799439014",
  chat: "507f1f77bcf86cd799439015",
  mensaje: "507f1f77bcf86cd799439016",
};
const asesor = { _id: ids.asesor, rol: "ASESOR", nombre: "Asesor prueba" };
const coordinador = { _id: ids.coordinador, rol: "COORDINADOR", nombre: "Coordinación prueba" };

test("las reglas de inicio son direccionales y permiten responder a ambos participantes", () => {
  for (const rol of ["ASESOR", "INSTALADOR"]) {
    assert.ok(puedeIniciarChat(rol, "COORDINADOR"));
    assert.ok(!puedeIniciarChat("COORDINADOR", rol));
    assert.ok(puedenConversar("COORDINADOR", rol));
    assert.ok(!puedeIniciarChat(rol, "INVENTARIO"));
  }
  for (const rol of ["INVENTARIO", "ADMIN"]) {
    assert.ok(puedeIniciarChat("COORDINADOR", rol));
    assert.ok(!puedeIniciarChat(rol, "COORDINADOR"));
    assert.ok(puedenConversar(rol, "COORDINADOR"));
  }
  assert.ok(!puedenConversar("VENTAS", "COORDINADOR"));
  assert.ok(!puedenConversar("ASESOR", "INSTALADOR"));
  assert.ok(!puedenConversar("COORDINADOR", "SUPERUSUARIO"));
});

test("el contexto distingue el chat general y cada orden, sin importar el orden de los participantes", () => {
  assert.equal(claveConversacion(ids.asesor, ids.coordinador, null), claveConversacion(ids.coordinador, ids.asesor, null));
  assert.notEqual(claveConversacion(ids.asesor, ids.coordinador, null), claveConversacion(ids.asesor, ids.coordinador, ids.orden));
  assert.deepEqual(alcanceOrdenChat(asesor), { creadoPor: ids.asesor });
  assert.deepEqual(alcanceOrdenChat({ _id: ids.instalador, rol: "INSTALADOR" }), { "coordinacion.asignaciones.instaladorId": ids.instalador });
});

test("las rutas protegen mensajes y fotos, y verifican el alcance de la orden al abrir un chat", async (t) => {
  const secreto = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "secreto-ficticio-chat-test";
  const usuarios = { [ids.asesor]: asesor, [ids.coordinador]: coordinador, [ids.instalador]: { _id: ids.instalador, rol: "INSTALADOR" } };
  t.mock.method(User, "findById", (id) => ({ select: () => Object.assign(Promise.resolve(usuarios[String(id)]), { lean: async () => usuarios[String(id)] }) }));
  t.mock.method(Conversacion, "findOne", (filtro) => {
    const propio = [ids.asesor, ids.coordinador].includes(filtro.participantes);
    return { lean: async () => propio ? { _id: ids.chat, participantes: [ids.asesor, ids.coordinador] } : null };
  });
  const buscarMensajes = t.mock.method(Mensaje, "find", () => assert.fail("Un tercero no puede consultar mensajes"));
  const buscarFoto = t.mock.method(Mensaje, "findOne", () => assert.fail("Un tercero no puede consultar fotos"));
  let ordenPermitida = false;
  t.mock.method(Asesoria, "exists", async (filtro) => {
    assert.deepEqual(filtro.$and, [
      { _id: ids.orden },
      { estado: { $ne: "CANCELADA" }, "flujo.etapa": { $nin: ["FINALIZADA", "CANCELADA"] } },
      { creadoPor: ids.asesor },
      {},
    ]);
    return ordenPermitida;
  });
  const crear = t.mock.method(Conversacion, "findOneAndUpdate", (_f, datos) => {
    assert.deepEqual(datos.$setOnInsert.participantes, [ids.asesor, ids.coordinador]);
    return { select: async () => ({ _id: ids.chat }) };
  });
  t.mock.method(Mensaje, "create", async (datos) => ({
    _id: ids.mensaje, createdAt: new Date(), toObject: () => ({ ...datos, _id: ids.mensaje }),
  }));
  const actualizar = t.mock.method(Conversacion, "updateOne", async () => ({ matchedCount: 1 }));
  t.mock.method(Mensaje, "exists", async (filtro) =>
    filtro._id === ids.mensaje && filtro.conversacion === ids.chat && filtro.autor?.$ne !== ids.coordinador);

  const app = express();
  app.use(express.json());
  app.use("/chat", chatRoutes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const llamar = (user, path, body) => fetch(`http://127.0.0.1:${server.address().port}/chat${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET)}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  try {
    assert.equal((await llamar(ids.instalador, `/conversaciones/${ids.chat}/mensajes`)).status, 404);
    assert.equal((await llamar(ids.instalador, `/conversaciones/${ids.chat}/fotos/${ids.mensaje}`)).status, 404);
    assert.equal(buscarMensajes.mock.callCount(), 0);
    assert.equal(buscarFoto.mock.callCount(), 0);
    assert.equal((await llamar(ids.coordinador, "/conversaciones", { destinatario: ids.asesor })).status, 403);
    assert.equal((await llamar(ids.asesor, "/conversaciones", { destinatario: ids.coordinador, orden: ids.orden })).status, 403);
    assert.equal(crear.mock.callCount(), 0);
    ordenPermitida = true;
    assert.equal((await llamar(ids.asesor, "/conversaciones", { destinatario: ids.coordinador, orden: ids.orden })).status, 200);
    assert.equal((await llamar(ids.asesor, "/conversaciones", { destinatario: ids.coordinador })).status, 200);
    assert.equal(crear.mock.calls[0].arguments[1].$setOnInsert.orden, ids.orden);
    assert.equal(crear.mock.calls[1].arguments[1].$setOnInsert.orden, null);
    const respuesta = await llamar(ids.coordinador, `/conversaciones/${ids.chat}/mensajes`, {
      texto: "Revisaré la orden", intento: "6d443959-88a7-4e48-8f55-ad4912df4924",
    });
    assert.equal(respuesta.status, 200);
    const mensaje = await respuesta.json();
    assert.equal(mensaje.autor, ids.coordinador);
    assert.equal(mensaje.foto, undefined);
    assert.equal(actualizar.mock.calls[0].arguments[1].$max[`ultimoPorAutor.${ids.coordinador}`], ids.mensaje);
    const rutaRecibo = `/conversaciones/${ids.chat}/recibido`;
    const recibo = { mensaje: ids.mensaje };
    assert.equal((await llamar(ids.instalador, rutaRecibo, recibo)).status, 404);
    assert.equal((await llamar(ids.coordinador, rutaRecibo, recibo)).status, 404);
    assert.equal((await llamar(ids.asesor, rutaRecibo, recibo)).status, 200);
    const marca = actualizar.mock.calls[1].arguments[1].$max[`recibidoHasta.${ids.asesor}`];
    assert.ok(marca instanceof mongoose.Types.ObjectId);
    assert.equal(String(marca), ids.mensaje);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (secreto === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secreto;
  }
});

test("la marca de lectura de MongoDB conserva el tipo ObjectId para compararla con el último mensaje", () => {
  const campo = `leidoHasta.${ids.asesor}`;
  const query = Conversacion.updateOne({ _id: ids.chat }, { $max: { [campo]: ids.mensaje } });
  const update = query._castUpdate(query.getUpdate());
  assert.ok(update.$max[campo] instanceof mongoose.Types.ObjectId);
});
