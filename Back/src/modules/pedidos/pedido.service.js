import detallePedidoModel from "./detallePedido.model.js";
import DetallePedido from "./detallePedido.model.js";
import Pedido from "./pedido.model.js";
import Rollo from "../rollos/rollo.model.js";

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

  const pedido = await Pedido.create({
    codigoPedido: data.codigoPedido,
    proveedor: data.proveedor,
    observaciones: data.observaciones,
  });

  const detalles =
    data.detalles.map((detalle) => ({
      ...detalle,
      pedidoId: pedido._id,
    }));

  await detallePedidoModel.insertMany(
    detalles
  );

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
