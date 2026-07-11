import CosteoPedido from "./costeoPedido.model.js";
import Pedido from "../pedidos/pedido.model.js";
import DetallePedido from "../pedidos/detallePedido.model.js";
import Rollo from "../rollos/rollo.model.js";
import Corte from "../cortes/corte.model.js";

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const tasaCambio = (moneda, trm) =>
  moneda === "USD" ? Number(trm || 0) : 1;

const calcularFactorProrrateo = ({
  metodo,
  detalle,
  subtotalProductosCop,
  totalRollos,
}) => {
  if (metodo === "CANTIDAD") {
    return totalRollos > 0
      ? Number(detalle.cantidadRollos || 0) / totalRollos
      : 0;
  }

  return subtotalProductosCop > 0
    ? Number(detalle.subtotalCop || 0) / subtotalProductosCop
    : 0;
};

export const calcularCosteo = async (data) => {
  const pedido =
    await Pedido.findById(data.pedidoId);

  if (!pedido) {
    throw new Error("Pedido no encontrado");
  }

  const detallesPedido =
    await DetallePedido.find({
      pedidoId: data.pedidoId,
    }).lean();

  if (!detallesPedido.length) {
    throw new Error(
      "El pedido no tiene detalles para costear"
    );
  }

  const moneda = data.moneda || "COP";
  const trm =
    moneda === "USD"
      ? Number(data.trm || 0)
      : 1;
  const trmFlete =
    moneda === "USD"
      ? Number(data.trmFlete || data.trm || 0)
      : 1;

  if (moneda === "USD" && trm <= 0) {
    throw new Error(
      "Ingrese la TRM para pedidos en dolares"
    );
  }

  const tasa = tasaCambio(moneda, trm);
  const tasaFlete = tasaCambio(moneda, trmFlete);
  const detallesEntrada = data.detalles || [];

  const detalles = detallesPedido.map((detalle) => {
    const entrada =
      detallesEntrada.find(
        (item) =>
          String(item.detallePedidoId) ===
          String(detalle._id)
      ) || {};

    const cantidadRollos =
      Number(detalle.cantidadRollos || 0);

    const valorUnitario =
      Number(entrada.valorUnitario || 0);

    const subtotalOriginal =
      valorUnitario * cantidadRollos;

    const valorUnitarioCop =
      valorUnitario * tasa;

    const subtotalCop =
      subtotalOriginal * tasa;

    return {
      detallePedidoId: detalle._id,
      tipoPolarizado:
        detalle.tipoPolarizado,
      porcentaje:
        detalle.porcentaje,
      unidadMedida:
        detalle.unidadMedida || "PORCENTAJE",
      ancho:
        detalle.ancho,
      cantidadRollos,
      valorUnitario:
        roundMoney(valorUnitario),
      subtotalOriginal:
        roundMoney(subtotalOriginal),
      valorUnitarioCop:
        roundMoney(valorUnitarioCop),
      subtotalCop:
        roundMoney(subtotalCop),
    };
  });

  const subtotalProductosOriginal =
    detalles.reduce(
      (acc, item) =>
        acc + item.subtotalOriginal,
      0
    );

  const subtotalProductosCop =
    detalles.reduce(
      (acc, item) => acc + item.subtotalCop,
      0
    );

  const totalRollos =
    detalles.reduce(
      (acc, item) =>
        acc + Number(item.cantidadRollos || 0),
      0
    );

  const flete = Number(data.flete || 0);
  const otrosCostos =
    Number(data.otrosCostos || 0);

  if (moneda === "USD" && flete > 0 && trmFlete <= 0) {
    throw new Error(
      "Ingrese la TRM del flete para pedidos en dolares"
    );
  }

  const fleteCop =
    flete * tasaFlete;

  const otrosCostosCop =
    otrosCostos * tasa;

  const porcentajeIva =
    Number(data.porcentajeIva ?? 19);

  const aplicaIva =
    data.aplicaIva === undefined
      ? true
      : Boolean(data.aplicaIva);

  const ivaIncluido =
    Boolean(data.ivaIncluido);

  let ivaCop = 0;
  let ivaExtraCop = 0;

  if (aplicaIva && porcentajeIva > 0) {
    const tasaIva =
      porcentajeIva / 100;

    if (ivaIncluido) {
      ivaCop =
        subtotalProductosCop -
        subtotalProductosCop / (1 + tasaIva);
    } else {
      ivaCop =
        subtotalProductosCop * tasaIva;
      ivaExtraCop = ivaCop;
    }
  }

  const metodoProrrateoFlete =
    data.metodoProrrateoFlete || "VALOR";

  const detallesCalculados =
    detalles.map((detalle) => {
      const factor =
        calcularFactorProrrateo({
          metodo: metodoProrrateoFlete,
          detalle,
          subtotalProductosCop,
          totalRollos,
        });

      const fleteAsignadoCop =
        fleteCop * factor;

      const otrosAsignadosCop =
        otrosCostosCop * factor;

      const ivaAsignadoCop =
        ivaCop * factor;

      const ivaExtraAsignadoCop =
        ivaExtraCop * factor;

      const costoFinalTotalCop =
        detalle.subtotalCop +
        fleteAsignadoCop +
        otrosAsignadosCop +
        ivaExtraAsignadoCop;

      return {
        ...detalle,
        fleteAsignadoCop:
          roundMoney(fleteAsignadoCop),
        otrosAsignadosCop:
          roundMoney(otrosAsignadosCop),
        ivaAsignadoCop:
          roundMoney(ivaAsignadoCop),
        costoFinalTotalCop:
          roundMoney(costoFinalTotalCop),
        costoFinalUnitarioCop:
          roundMoney(
            detalle.cantidadRollos > 0
              ? costoFinalTotalCop /
                  detalle.cantidadRollos
              : 0
          ),
      };
    });

  const totalOriginal =
    subtotalProductosOriginal +
    flete +
    otrosCostos +
    (moneda === "USD"
      ? ivaExtraCop / tasa
      : ivaExtraCop);

  const totalCop =
    subtotalProductosCop +
    fleteCop +
    otrosCostosCop +
    ivaExtraCop;

  return {
    pedidoId: data.pedidoId,
    moneda,
    trm,
    trmFlete,
    flete:
      roundMoney(flete),
    otrosCostos:
      roundMoney(otrosCostos),
    aplicaIva,
    ivaIncluido,
    porcentajeIva,
    metodoProrrateoFlete,
    estado:
      data.estado || "COSTEADO",
    observaciones:
      data.observaciones || "",
    detalles: detallesCalculados,
    subtotalProductosOriginal:
      roundMoney(subtotalProductosOriginal),
    subtotalProductosCop:
      roundMoney(subtotalProductosCop),
    fleteCop:
      roundMoney(fleteCop),
    otrosCostosCop:
      roundMoney(otrosCostosCop),
    ivaCop:
      roundMoney(ivaCop),
    totalOriginal:
      roundMoney(totalOriginal),
    totalCop:
      roundMoney(totalCop),
    costoPromedioRolloCop:
      roundMoney(
        totalRollos > 0
          ? totalCop / totalRollos
          : 0
      ),
  };
};

export const guardarCosteoPedido =
  async (data) => {
    const calculado =
      await calcularCosteo(data);

    const costeo =
      await CosteoPedido.findOneAndUpdate(
      {
        pedidoId: data.pedidoId,
      },
      calculado,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).populate("pedidoId");

    await asignarCostosARollos(costeo);

    return costeo;
  };

export const asignarCostosARollos =
  async (costeo) => {
    if (!costeo?.detalles?.length) {
      return;
    }

    const pedidoId =
      costeo.pedidoId?._id || costeo.pedidoId;

    await Promise.all(
      costeo.detalles.map(async (detalle) => {
        const rollos =
          await Rollo.find({
            pedidoId,
            tipoPolarizado:
              detalle.tipoPolarizado,
            porcentaje:
              Number(detalle.porcentaje),
            unidadMedida:
              detalle.unidadMedida || "PORCENTAJE",
            ...(detalle.ancho
              ? {
                  ancho:
                    Number(detalle.ancho),
                }
              : {}),
          });

        await Promise.all(
          rollos.map(async (rollo) => {
            const costoUnitarioCop =
              Number(
                detalle.costoFinalUnitarioCop || 0
              );

            rollo.costoUnitarioCop =
              roundMoney(costoUnitarioCop);
            rollo.costoPorMetroCop =
              roundMoney(
                rollo.largoOriginal > 0
                  ? costoUnitarioCop /
                      rollo.largoOriginal
                  : 0
              );
            rollo.costoTotalAsignadoCop =
              roundMoney(costoUnitarioCop);
            rollo.costeoPedidoId =
              costeo._id;
            rollo.costoAsignadoAt =
              new Date();

            await rollo.save();
          })
        );
      })
    );
  };

export const obtenerCosteos =
  async () => {
    return await CosteoPedido.find()
      .populate("pedidoId")
      .sort({
        updatedAt: -1,
      });
  };

export const obtenerCosteoPorPedido =
  async (pedidoId) => {
    return await CosteoPedido.findOne({
      pedidoId,
    }).populate("pedidoId");
  };

export const obtenerResumenFinanciero =
  async () => {
    const costeos =
      await CosteoPedido.find();

    const totalCosteado =
      costeos.reduce(
        (acc, item) =>
          acc + Number(item.totalCop || 0),
        0
      );

    const totalRollos =
      costeos.reduce(
        (acc, item) =>
          acc +
          item.detalles.reduce(
            (sum, detalle) =>
              sum +
              Number(detalle.cantidadRollos || 0),
            0
          ),
        0
      );

    return {
      pedidosCosteados:
        costeos.length,
      totalCosteado:
        roundMoney(totalCosteado),
      totalRollos,
      costoPromedioRollo:
        roundMoney(
          totalRollos > 0
            ? totalCosteado / totalRollos
            : 0
        ),
    };
  };

export const obtenerReporteFinanciero =
  async () => {
    const cortes =
      await Corte.find().lean();

    const totalVentas =
      cortes.reduce(
        (acc, corte) =>
          acc + Number(corte.valorVenta || 0),
        0
      );

    const costoMaterial =
      cortes.reduce(
        (acc, corte) =>
          acc +
          Number(corte.costoMaterialCop || 0),
        0
      );

    const utilidadBruta =
      totalVentas - costoMaterial;

    return {
      rentabilidad: {
        totalVentas:
          roundMoney(totalVentas),
        costoMaterial:
          roundMoney(costoMaterial),
        utilidadBruta:
          roundMoney(utilidadBruta),
        margenBrutoPorcentaje:
          roundMoney(
            totalVentas > 0
              ? (utilidadBruta / totalVentas) * 100
              : 0
          ),
      },
    };
  };
