import Recepcion from "./recepcion.model.js";
import Rollo from "../rollos/rollo.model.js";
import { registrarRollo } from "../rollos/rollo.service.js";
import {
  crearAlertaRecepcion,
} from "../alertas/alerta.service.js";

export const crearRecepcion = async (data) => {

  const recepcion =
    await Recepcion.create({

      codigoRecepcion:
        `REC-${Date.now()}`,

      cantidadRollos:
        Number(
          data.cantidadRollos
        ),

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

export const obtenerRecepciones = async () => {

  const recepciones =
    await Recepcion.find()
    .sort({
      createdAt: -1
    })
    .lean();

  const rollos =
    await Rollo.find({
      recepcionId: {
        $in: recepciones.map(
          (recepcion) => recepcion._id
        ),
      },
    }).lean();

  return recepciones.map((recepcion) => ({
    ...recepcion,
    rollos: rollos.filter(
      (rollo) =>
        String(rollo.recepcionId) ===
        String(recepcion._id)
    ),
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
    const recepcion =
      await Recepcion.findById(recepcionId);

    if (!recepcion) {
      throw new Error("Recepcion no encontrada");
    }

    if (
      recepcion.clasificados >=
      recepcion.cantidadRollos
    ) {
      throw new Error(
        "Esta recepcion ya esta completamente clasificada"
      );
    }

    const rollo =
      await registrarRollo({
        ...data,
        recepcionId,
      });

    recepcion.clasificados += 1;

    recepcion.estado =
      recepcion.clasificados >=
      recepcion.cantidadRollos
        ? "COMPLETADA"
        : "PARCIAL";

    await recepcion.save();

    return {
      recepcion,
      rollo,
    };
  };
