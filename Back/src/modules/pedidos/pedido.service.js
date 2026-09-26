import mongoose from "mongoose";
import detallePedidoModel from "./detallePedido.model.js";
import DetallePedido from "./detallePedido.model.js";
import Pedido from "./pedido.model.js";
import Rollo from "../rollos/rollo.model.js";
import {
  mongoSoportaTransacciones,
} from "../../config/db.js";

const UNIDADES_MATERIAL = new Set([
  "PORCENTAJE",
  "MICRAS",
  "NINGUNA",
]);

export const prepararDetallePedido = (detalle, pedidoId) => {
  const tipoPolarizado = String(
    detalle.tipoPolarizado || ""
  )
    .trim()
    .toUpperCase();
  const unidadMedida =
    detalle.unidadMedida || "PORCENTAJE";
  const porcentaje =
    unidadMedida === "NINGUNA"
      ? 0
      : Number(detalle.porcentaje);
  const ancho = Number(detalle.ancho);
  const cantidadRollos = Number(
    detalle.cantidadRollos
  );

  if (!tipoPolarizado) {
    throw new Error(
      "Ingrese el nombre del material"
    );
  }

  if (!UNIDADES_MATERIAL.has(unidadMedida)) {
    throw new Error(
      "La clasificacion del material no es valida"
    );
  }

  if (
    !Number.isFinite(porcentaje) ||
    (unidadMedida !== "NINGUNA" && porcentaje <= 0)
  ) {
    throw new Error(
      "Ingrese un porcentaje o micraje valido"
    );
  }

  if (!Number.isFinite(ancho) || ancho <= 0) {
    throw new Error(
      "Ingrese un ancho valido"
    );
  }

  if (
    !Number.isInteger(cantidadRollos) ||
    cantidadRollos <= 0
  ) {
    throw new Error(
      "Ingrese una cantidad de rollos valida"
    );
  }

  return {
    pedidoId,
    tipoPolarizado,
    porcentaje,
    unidadMedida,
    ancho,
    cantidadRollos,
  };
};

export const crearPedido = async (data) => {
  return await Pedido.create(data);
};

export const obtenerPedidos =async () => {
    const pedidos =
      await Pedido.find()
        .sort({ createdAt: -1 })
        .lean();

    const detalles =
      await DetallePedido.find({
        pedidoId: {
          $in: pedidos.map((pedido) => pedido._id),
        },
      }).lean();

    return pedidos.map((pedido) => ({
      ...pedido,
      detalles: detalles.filter(
        (detalle) =>
          String(detalle.pedidoId) ===
          String(pedido._id)
      ),
    }));
  };

export const obtenerPedidoPorId =async (id) => {
    return await Pedido.findById(id);
  };

export const crearPedidoCompleto = async (
  data
) => {
  if (!data.detalles?.length) {
    throw new Error(
      "Debe enviar detalles del pedido"
    );
  }

  const detallesValidados =
    data.detalles.map((detalle) =>
      prepararDetallePedido(detalle)
    );

  let pedido;

  const guardarPedido = async (
    session = null
  ) => {
    const options = session
      ? { session }
      : {};

    [pedido] = await Pedido.create(
      [
        {
          codigoPedido: data.codigoPedido,
          proveedor: data.proveedor,
          observaciones: data.observaciones,
        },
      ],
      options
    );

    const detalles =
      detallesValidados.map((detalle) => ({
        ...detalle,
        pedidoId: pedido._id,
      }));

    await detallePedidoModel.insertMany(
      detalles,
      options
    );
  };

  if (!mongoSoportaTransacciones()) {
    try {
      await guardarPedido();
    } catch (error) {
      if (pedido?._id) {
        await Promise.allSettled([
          DetallePedido.deleteMany({
            pedidoId: pedido._id,
          }),
          Pedido.findByIdAndDelete(pedido._id),
        ]);
      }

      throw error;
    }

    return pedido;
  }

  const session =
    await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await guardarPedido(session);
    });
  } finally {
    await session.endSession();
  }

  return pedido;
};
export const actualizarEstadoPedido =
  async (pedidoId) => {
    const detalles =
      await DetallePedido.find({
        pedidoId,
      });

    const completos =
      detalles.every(
        (detalle) =>
          detalle.cantidadRecibida >=
          detalle.cantidadRollos
      );

    const algunoRecibido =
      detalles.some(
        (detalle) =>
          detalle.cantidadRecibida > 0
      );

    let estado = "PENDIENTE";

    if (completos) {
      estado = "COMPLETADO";
    } else if (
      algunoRecibido
    ) {
      estado = "PARCIAL";
    }

    await Pedido.findByIdAndUpdate(
      pedidoId,
      { estado }
    );
  };

export const eliminarPedido = async (id) => {
  const rollosAsociados =
    await Rollo.countDocuments({
      pedidoId: id,
    });

  if (rollosAsociados > 0) {
    throw new Error(
      "No se puede eliminar un pedido con rollos asociados"
    );
  }

  const pedido =
    await Pedido.findByIdAndDelete(id);

  if (!pedido) {
    throw new Error("Pedido no encontrado");
  }

  await DetallePedido.deleteMany({
    pedidoId: id,
  });

  return pedido;
};

export const actualizarPedido = async (
  id,
  data
) => {
  const pedido =
    await Pedido.findById(id);

  if (!pedido) {
    throw new Error("Pedido no encontrado");
  }

  let detallesActuales = [];
  let detallesEliminados = [];

  if (Array.isArray(data.detalles)) {
    if (data.detalles.length === 0) {
      throw new Error(
        "El pedido debe tener al menos un material"
      );
    }

    detallesActuales =
      await DetallePedido.find({
        pedidoId: id,
      });

    const actualesPorId = new Map(
      detallesActuales.map((detalle) => [
        String(detalle._id),
        detalle,
      ])
    );

    const idsRecibidos = new Set();

    for (const item of data.detalles) {
      const cantidadRollos =
        Number(item.cantidadRollos || 0);

      if (
        !item.tipoPolarizado ||
        item.porcentaje === "" ||
        item.porcentaje === undefined ||
        item.porcentaje === null ||
        !item.ancho ||
        cantidadRollos <= 0
      ) {
        throw new Error(
          "Complete material, clasificacion, ancho y cantidad de rollos"
        );
      }

      if (item._id) {
        const detalleActual = actualesPorId.get(
          String(item._id)
        );

        if (!detalleActual) {
          throw new Error(
            "Uno de los materiales no pertenece a este pedido"
          );
        }

        idsRecibidos.add(String(item._id));

        const cantidadRecibida = Number(
          detalleActual.cantidadRecibida || 0
        );

        if (cantidadRollos < cantidadRecibida) {
          throw new Error(
            "La cantidad pedida no puede ser menor a la cantidad recibida"
          );
        }

        if (cantidadRecibida > 0) {
          const cambioMaterial =
            detalleActual.tipoPolarizado !==
              item.tipoPolarizado ||
            Number(detalleActual.porcentaje) !==
              Number(item.porcentaje) ||
            (detalleActual.unidadMedida || "PORCENTAJE") !==
              (item.unidadMedida || "PORCENTAJE") ||
            Number(detalleActual.ancho) !==
              Number(item.ancho);

          if (cambioMaterial) {
            throw new Error(
              "No se puede cambiar el material de una linea que ya tiene rollos recibidos"
            );
          }
        }

      }
    }

    detallesEliminados =
      detallesActuales.filter(
        (detalle) =>
          !idsRecibidos.has(String(detalle._id))
      );

    const detalleRecibidoEliminado =
      detallesEliminados.find(
        (detalle) =>
          Number(detalle.cantidadRecibida || 0) > 0
      );

    if (detalleRecibidoEliminado) {
      throw new Error(
        "No se puede eliminar una linea que ya tiene rollos recibidos"
      );
    }
  }

  pedido.codigoPedido = data.codigoPedido;
  pedido.proveedor = data.proveedor;
  pedido.observaciones =
    data.observaciones || "";

  await pedido.save();

  if (Array.isArray(data.detalles)) {
    const actualesPorId = new Map(
      detallesActuales.map((detalle) => [
        String(detalle._id),
        detalle,
      ])
    );

    for (const item of data.detalles) {
      const cantidadRollos =
        Number(item.cantidadRollos || 0);

      if (item._id) {
        const detalleActual = actualesPorId.get(
          String(item._id)
        );

        detalleActual.tipoPolarizado =
          item.tipoPolarizado;
        detalleActual.porcentaje =
          Number(item.porcentaje);
        detalleActual.unidadMedida =
          item.unidadMedida || "PORCENTAJE";
        detalleActual.ancho = Number(item.ancho);
        detalleActual.cantidadRollos =
          cantidadRollos;

        await detalleActual.save();
      } else {
        await DetallePedido.create({
          pedidoId: pedido._id,
          tipoPolarizado: item.tipoPolarizado,
          porcentaje: Number(item.porcentaje),
          unidadMedida:
            item.unidadMedida || "PORCENTAJE",
          ancho: Number(item.ancho),
          cantidadRollos,
        });
      }
    }

    if (detallesEliminados.length > 0) {
      await DetallePedido.deleteMany({
        _id: {
          $in: detallesEliminados.map(
            (detalle) => detalle._id
          ),
        },
      });
    }

    await actualizarEstadoPedido(pedido._id);
  }

  return pedido;
};
