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
    await Pedido.findByIdAndUpdate(
      id,
      {
        codigoPedido: data.codigoPedido,
        proveedor: data.proveedor,
        observaciones: data.observaciones || "",
      },
      {
        new: true,
        runValidators: true,
      }
    );

  if (!pedido) {
    throw new Error("Pedido no encontrado");
  }

  return pedido;
};
