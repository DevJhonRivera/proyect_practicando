import Recepcion from "./recepcion.model.js";
import Rollo from "../rollos/rollo.model.js";
import { registrarRollo } from "../rollos/rollo.service.js";
import {
  crearAlertaRecepcion,
} from "../alertas/alerta.service.js";

export const crearRecepcion = async (data) => {

  const cantidadRollos = Number(data.cantidadRollos);
  if (!Number.isInteger(cantidadRollos) || cantidadRollos <= 0 || cantidadRollos > 10000) {
    throw new Error("Ingrese una cantidad de rollos valida");
  }

  const recepcion =
    await Recepcion.create({

      codigoRecepcion:
        `REC-${Date.now()}`,

      cantidadRollos,

      clasificados: 0,

      observaciones:
        data.observaciones || "",

      estado:
        "PENDIENTE_CLASIFICACION"

    });

  await crearAlertaRecepcion(
    recepcion
  );

  return recepcion;

};

export const obtenerRecepciones = async ({ desde, hasta, limite } = {}) => {

  const query = {};
  if (desde || hasta) {
    query.createdAt = {};
    if (desde) query.createdAt.$gte = new Date(`${desde}T00:00:00`);
    if (hasta) query.createdAt.$lte = new Date(`${hasta}T23:59:59.999`);
  }
  const maximo = Math.min(Math.max(Number(limite) || 500, 1), 1000);

  const recepciones =
    await Recepcion.find(query)
    .sort({
      createdAt: -1
    })
    .limit(maximo)
    .lean();

  const rollos =
    await Rollo.find({
      recepcionId: {
        $in: recepciones.map(
          (recepcion) => recepcion._id
        ),
      },
    }).lean();

  const rollosPorRecepcion = rollos.reduce((mapa, rollo) => {
    const clave = String(rollo.recepcionId);
    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave).push(rollo);
    return mapa;
  }, new Map());

  return recepciones.map((recepcion) => ({
    ...recepcion,
    rollos: rollosPorRecepcion.get(String(recepcion._id)) || [],
  }));

};

export const obtenerRecepcionPorId = async (id) => {

  const recepcion =
    await Recepcion.findById(id).lean();

  if (!recepcion) {
    return null;
  }

  const rollos =
    await Rollo.find({
      recepcionId: id,
    }).lean();

  return {
    ...recepcion,
    rollos,
  };

};

export const clasificarRolloRecepcion =
  async (recepcionId, data) => {
    const recepcion = await Recepcion.findOneAndUpdate(
      {
        _id: recepcionId,
        $expr: { $lt: ["$clasificados", "$cantidadRollos"] },
      },
      { $inc: { clasificados: 1 } },
      { new: true }
    );

    if (!recepcion) {
      const existe = await Recepcion.exists({ _id: recepcionId });
      throw new Error(existe
        ? "Esta recepcion ya esta completamente clasificada"
        : "Recepcion no encontrada");
    }

    let rollo;
    try {
      rollo = await registrarRollo({
        ...data,
        recepcionId,
      });
    } catch (error) {
      await Recepcion.findByIdAndUpdate(recepcionId, {
        $inc: { clasificados: -1 },
        $set: { estado: recepcion.clasificados > 1 ? "PARCIAL" : "PENDIENTE_CLASIFICACION" },
      });
      throw error;
    }

    recepcion.estado =
      recepcion.clasificados >=
      recepcion.cantidadRollos
        ? "COMPLETADA"
        : "PARCIAL";

    await Recepcion.findByIdAndUpdate(recepcionId, { estado: recepcion.estado });

    return {
      recepcion,
      rollo,
    };
  };
