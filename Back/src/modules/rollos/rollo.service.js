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
import Corte from "../cortes/corte.model.js";

const roundMeters = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const registrarRollo = async (data) => {

  const largoOriginal = roundMeters(
    data.largoOriginal
  );
  const tieneLargoDisponible =
    data.largoDisponible !== undefined &&
    data.largoDisponible !== null &&
    data.largoDisponible !== "";
  const largoDisponible = tieneLargoDisponible
    ? roundMeters(data.largoDisponible)
    : largoOriginal;

  if (largoOriginal <= 0) {
    throw new Error(
      "Ingrese un largo original valido"
    );
  }

  if (
    largoDisponible <= 0 ||
    largoDisponible > largoOriginal
  ) {
    throw new Error(
      "El largo disponible debe ser mayor a cero y no puede superar el largo original"
    );
  }

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
      largoOriginal,
      largoDisponible,
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

  const tieneCostoAsignado =
    Boolean(rollo.costeoPedidoId) &&
    Number(rollo.costoUnitarioCop || 0) > 0 &&
    Number(rollo.costoPorMetroCop || 0) > 0;

  if (!tieneCostoAsignado) {
    throw new Error(
      "Este rollo todavía no tiene costo. Debe costear el pedido antes de pasarlo a uso"
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
    rollo.fechaAgotado = rollo.fechaAgotado || new Date();

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

export const obtenerReabastecimiento = async () => {
  const desde = new Date();
  desde.setDate(desde.getDate() - 90);

  const [rollos, cortes] = await Promise.all([
    Rollo.find().populate("pedidoId", "fechaPedido").lean(),
    Corte.find({ createdAt: { $gte: desde }, rolloId: { $ne: null } })
      .select("rolloId metrosUtilizados createdAt")
      .lean(),
  ]);

  const rolloPorId = new Map(rollos.map((rollo) => [String(rollo._id), rollo]));
  const grupos = new Map();
  const claveDe = (item) => [
    item.tipoPolarizado,
    item.unidadMedida || "PORCENTAJE",
    Number(item.porcentaje || 0),
    Number(item.ancho || 0).toFixed(4),
  ].join("|");

  rollos.forEach((rollo) => {
    const clave = claveDe(rollo);
    const grupo = grupos.get(clave) || {
      clave,
      tipoPolarizado: rollo.tipoPolarizado,
      unidadMedida: rollo.unidadMedida || "PORCENTAJE",
      porcentaje: Number(rollo.porcentaje || 0),
      ancho: Number(rollo.ancho || 0),
      stockMetros: 0,
      rollosReserva: 0,
      rollosUso: 0,
      largosOriginales: [],
      leadTimes: [],
      consumo90Dias: 0,
      ultimaFechaAgotado: null,
    };
    if (["RESERVA", "USO"].includes(rollo.estado)) {
      grupo.stockMetros += Number(rollo.largoDisponible || 0);
      grupo.rollosReserva += rollo.estado === "RESERVA" ? 1 : 0;
      grupo.rollosUso += rollo.estado === "USO" ? 1 : 0;
    }
    if (Number(rollo.largoOriginal || 0) > 0) grupo.largosOriginales.push(Number(rollo.largoOriginal));
    const fechaPedido = rollo.pedidoId?.fechaPedido;
    if (fechaPedido && rollo.createdAt) {
      const dias = Math.max(1, Math.ceil((new Date(rollo.createdAt) - new Date(fechaPedido)) / 86400000));
      if (Number.isFinite(dias) && dias <= 365) grupo.leadTimes.push(dias);
    }
    if (rollo.fechaAgotado && (!grupo.ultimaFechaAgotado || new Date(rollo.fechaAgotado) > new Date(grupo.ultimaFechaAgotado))) {
      grupo.ultimaFechaAgotado = rollo.fechaAgotado;
    }
    grupos.set(clave, grupo);
  });

  cortes.forEach((corte) => {
    const rollo = rolloPorId.get(String(corte.rolloId));
    if (!rollo) return;
    const grupo = grupos.get(claveDe(rollo));
    if (grupo) grupo.consumo90Dias += Number(corte.metrosUtilizados || 0);
  });

  return Array.from(grupos.values()).map((grupo) => {
    const consumoDiario = grupo.consumo90Dias / 90;
    const leadTimeDias = grupo.leadTimes.length
      ? Math.ceil(grupo.leadTimes.reduce((total, dias) => total + dias, 0) / grupo.leadTimes.length)
      : 30;
    const puntoPedidoMetros = consumoDiario * (leadTimeDias + 7);
    const coberturaDias = consumoDiario > 0 ? grupo.stockMetros / consumoDiario : null;
    const largoPromedio = grupo.largosOriginales.length
      ? grupo.largosOriginales.reduce((total, largo) => total + largo, 0) / grupo.largosOriginales.length
      : 30;
    const objetivoMetros = consumoDiario * (leadTimeDias + 37);
    const faltante = Math.max(objetivoMetros - grupo.stockMetros, 0);
    const cantidadSugerida = Math.max(Math.ceil(faltante / Math.max(largoPromedio, 1)), 1);
    const pedirAhora = grupo.rollosReserva <= 1 || grupo.stockMetros <= puntoPedidoMetros;
    const pedirPronto = !pedirAhora && (grupo.rollosReserva <= 2 || grupo.stockMetros <= puntoPedidoMetros + consumoDiario * 14);
    return {
      ...grupo,
      stockMetros: roundMeters(grupo.stockMetros),
      consumoDiario: roundMeters(consumoDiario),
      leadTimeDias,
      leadTimeEstimado: grupo.leadTimes.length === 0,
      puntoPedidoMetros: roundMeters(puntoPedidoMetros),
      coberturaDias: coberturaDias === null ? null : Math.round(coberturaDias),
      cantidadSugerida: pedirAhora || pedirPronto ? cantidadSugerida : 0,
      estado: pedirAhora ? "PEDIR_AHORA" : pedirPronto ? "PEDIR_PRONTO" : consumoDiario <= 0 ? "SIN_HISTORIAL" : "SUFICIENTE",
    };
  }).sort((a, b) => {
    const prioridad = { PEDIR_AHORA: 0, PEDIR_PRONTO: 1, SIN_HISTORIAL: 2, SUFICIENTE: 3 };
    return prioridad[a.estado] - prioridad[b.estado] || a.tipoPolarizado.localeCompare(b.tipoPolarizado);
  });
};
