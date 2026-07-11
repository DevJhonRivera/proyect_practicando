import Rollo from "./rollo.model.js";
import Movimiento from
"../movimientos/movimiento.model.js";
import {
  actualizarEstadoPedido,
} from "../pedidos/pedido.service.js";
import mongoose from "mongoose";
import Pedido from "../pedidos/pedido.model.js";
import detallePedido from "../pedidos/detallePedido.model.js";
import CosteoPedido from "../finanzas/costeoPedido.model.js";
import {
  verificarStockReserva,
} from "../alertas/alerta.service.js";
import {
  crearRetazo,
} from "../retazos/retazo.service.js";

const roundMeters = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const registrarRollo = async (data) => {

  // Buscar pedido
  const pedido = await Pedido.findOne({
    codigoPedido: data.codigoPedido,
  });

  if (!pedido) {
    throw new Error(
      "El pedido no existe"
    );
  }

  const unidadMedida =
    data.unidadMedida || "PORCENTAJE";

  const filtroUnidad =
    unidadMedida === "PORCENTAJE"
      ? {
          $or: [
            {
              unidadMedida,
            },
            {
              unidadMedida: {
                $exists: false,
              },
            },
            {
              unidadMedida: null,
            },
          ],
        }
      : {
          unidadMedida,
        };

  const detalleBase = {
    pedidoId: pedido._id,
    tipoPolarizado:
      data.tipoPolarizado,
    porcentaje:
      Number(data.porcentaje),
  };

  let detalle = null;

  if (data.ancho !== undefined) {
    detalle =
      await detallePedido.findOne({
        ...detalleBase,
        ...filtroUnidad,
        ancho:
          Number(data.ancho),
      });
  }

  if (!detalle) {
    detalle =
      await detallePedido.findOne({
        ...detalleBase,
        $and: [
          filtroUnidad,
          {
            $or: [
              {
                ancho: {
                  $exists: false,
                },
              },
              {
                ancho: null,
              },
            ],
          },
        ],
      });
  }

  if (!detalle) {
    throw new Error(
      "Este material no existe en el pedido"
    );
  }

  // Validar cantidad máxima
  if (
    detalle.cantidadRecibida >=
    detalle.cantidadRollos
  ) {
    throw new Error(
      "Ya se completó el material de este pedido"
    );
  }

  // Validar código de rollo duplicado
  const existeRollo =
    await Rollo.findOne({
      codigoRollo:
        data.codigoRollo,
    });

  if (existeRollo) {
    throw new Error(
      "Ya existe un rollo con ese código"
    );
  }

  // Crear rollo PRIMERO
  const rollo =
    await Rollo.create({
      ...data,
      unidadMedida,
      pedidoId: pedido._id,
      estado: "RESERVA",
      largoDisponible:
        data.largoOriginal,
    });

  const costeo =
    await CosteoPedido.findOne({
      pedidoId: pedido._id,
    });

  const detalleCosteo =
    costeo?.detalles?.find(
      (item) =>
        item.tipoPolarizado ===
          rollo.tipoPolarizado &&
        Number(item.porcentaje) ===
          Number(rollo.porcentaje) &&
        (item.unidadMedida || "PORCENTAJE") ===
          (rollo.unidadMedida || "PORCENTAJE") &&
        (!item.ancho ||
          Number(item.ancho) ===
            Number(rollo.ancho))
    );

  if (detalleCosteo) {
    const costoUnitarioCop =
      Number(
        detalleCosteo.costoFinalUnitarioCop || 0
      );

    rollo.costoUnitarioCop =
      costoUnitarioCop;
    rollo.costoPorMetroCop =
      rollo.largoOriginal > 0
        ? costoUnitarioCop /
          rollo.largoOriginal
        : 0;
    rollo.costoTotalAsignadoCop =
      costoUnitarioCop;
    rollo.costeoPedidoId =
      costeo._id;
    rollo.costoAsignadoAt =
      new Date();

    await rollo.save();
  }

  // Si llegó aquí, el rollo sí existe

  detalle.cantidadRecibida += 1;

  await detalle.save();

  await actualizarEstadoPedido(
    pedido._id
  );

  await verificarStockReserva();

  return rollo;
};

export const pasarAUso =
async (id) => {

  const rollo =
    await Rollo.findById(id);

  if (!rollo) {
    throw new Error(
      "Rollo no encontrado"
    );
  }

  if (
    rollo.estado === "USO"
  ) {
    throw new Error(
      "El rollo ya está en uso"
    );
  }

  if (
    rollo.estado === "AGOTADO"
  ) {
    throw new Error(
      "El rollo está agotado"
    );
  }

  rollo.estado = "USO";

  await rollo.save();

  await verificarStockReserva();

  return rollo;
};

export const cerrarRolloAgotado =
  async (
    id,
    {
      enviarARetazos = false,
      observaciones = "",
    } = {}
  ) => {
    const rollo =
      await Rollo.findById(id);

    if (!rollo) {
      throw new Error(
        "Rollo no encontrado"
      );
    }

    if (rollo.estado === "AGOTADO") {
      throw new Error(
        "El rollo ya esta agotado"
      );
    }

    if (rollo.estado !== "USO") {
      throw new Error(
        "Solo se pueden agotar rollos en uso"
      );
    }

    const largoRestante =
      roundMeters(rollo.largoDisponible);

    let retazo = null;

    if (
      enviarARetazos &&
      largoRestante > 0
    ) {
      retazo = await crearRetazo({
        tipoPolarizado:
          rollo.tipoPolarizado,
        porcentaje:
          rollo.porcentaje,
        unidadMedida:
          rollo.unidadMedida || "PORCENTAJE",
        ancho:
          rollo.ancho,
        largoOriginal:
          largoRestante,
        largoDisponible:
          largoRestante,
        costoPorMetroCop:
          rollo.costoPorMetroCop,
        costoTotalCop:
          Number(rollo.costoPorMetroCop || 0) *
          largoRestante,
        origenRolloId:
          rollo._id,
        observaciones:
          observaciones ||
          `Sobrante del rollo ${rollo.codigoRollo}`,
      });
    }

    rollo.largoDisponible = 0;
    rollo.estado = "AGOTADO";

    await rollo.save();

    return {
      rollo,
      retazo,
      largoCerrado:
        largoRestante,
    };
  };


export const obtenerRollos =
  async () => {
    return await Rollo.find()
      .populate("pedidoId")
      .populate("recepcionId")
      .sort({
        createdAt: -1,
      });
  };

export const obtenerRolloPorId =
  async (id) => {
    return await Rollo.findById(id)
      .populate("pedidoId")
      .populate("recepcionId");
  };
  export const obtenerRollosPorEstado =
  async (estado) => {
    return await Rollo.find({
      estado,
    });
  };
