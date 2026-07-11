import Alerta from "./alerta.model.js";
import Rollo from "../rollos/rollo.model.js";

export const TIPO_STOCK_RESERVA_UN_ROLLO =
  "STOCK_RESERVA_UN_ROLLO";
export const TIPO_STOCK_RESERVA_DOS_ROLLOS =
  "STOCK_RESERVA_DOS_ROLLOS";
export const TIPO_RECEPCION_NUEVA =
  "RECEPCION_NUEVA";
export const TIPO_VENTA_PENDIENTE =
  "VENTA_PENDIENTE";
export const TIPO_VENTA_REVISION_CORTES =
  "VENTA_REVISION_CORTES";

const TIPOS_STOCK_RESERVA = [
  TIPO_STOCK_RESERVA_UN_ROLLO,
  TIPO_STOCK_RESERVA_DOS_ROLLOS
];

const claveMaterialReserva = ({
  tipo,
  porcentaje,
  unidadMedida,
  ancho,
  cantidad
}) =>
  [
    "stock-reserva",
    String(tipo || "").trim().toUpperCase(),
    Number(porcentaje || 0),
    String(unidadMedida || "PORCENTAJE"),
    Number(ancho || 0).toFixed(2),
    Number(cantidad || 0)
  ].join(":");

const etiquetaClasificacion = (
  valor,
  unidadMedida = "PORCENTAJE"
) =>
  unidadMedida === "NINGUNA"
    ? ""
    : unidadMedida === "MICRAS"
    ? `${valor} micras`
    : `${valor}%`;

const anchoEnPulgadas = (ancho) => {
  const pulgadas =
    Math.round(Number(ancho || 0) * 39.3701);

  return pulgadas > 0
    ? `${pulgadas}"`
    : "sin ancho";
};

export const crearAlerta =
  async (
    tipo,
    mensaje,
    referenciaId,
    clave
  ) => {
    if (clave) {
      return await Alerta.findOneAndUpdate(
        {
          clave
        },
        {
          tipo,
          mensaje,
          referenciaId
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      );
    }

    return await Alerta.create({
      tipo,
      mensaje,
      referenciaId
    });
  };

export const verificarStockReserva =
  async () => {
    const resultado =
      await Rollo.aggregate([
        {
          $match: {
            estado: "RESERVA"
          }
        },
        {
          $group: {
            _id: {
              tipo:
                "$tipoPolarizado",
              porcentaje:
                "$porcentaje",
              unidadMedida: {
                $ifNull: [
                  "$unidadMedida",
                  "PORCENTAJE"
                ]
              },
              ancho:
                "$ancho"
            },
            cantidad: {
              $sum: 1
            },
            rolloId: {
              $first: "$_id"
            },
            codigos: {
              $push: "$codigoRollo"
            }
          }
        }
      ]);

    const clavesActivas = [];

    for (const item of resultado) {
      const clave =
        claveMaterialReserva({
          tipo: item._id.tipo,
          porcentaje:
            item._id.porcentaje,
          unidadMedida:
            item._id.unidadMedida,
          ancho:
            item._id.ancho,
          cantidad:
            item.cantidad
        });

      if (item.cantidad === 1 || item.cantidad === 2) {
        clavesActivas.push(clave);

        const alertaExistente =
          await Alerta.findOne({
            clave,
            activa: {
              $ne: false
            }
          });

        const tipoAlerta =
          item.cantidad === 1
            ? TIPO_STOCK_RESERVA_UN_ROLLO
            : TIPO_STOCK_RESERVA_DOS_ROLLOS;

        const codigos =
          item.codigos?.filter(Boolean).join(", ");

        const clasificacion =
          etiquetaClasificacion(
            item._id.porcentaje,
            item._id.unidadMedida
          );
        const detalleMaterial =
          clasificacion
            ? `${item._id.tipo} ${clasificacion}`
            : item._id.tipo;

        const datosAlerta = {
          tipo:
            tipoAlerta,
          mensaje:
            item.cantidad === 1
              ? `Queda solo 1 rollo en reserva de ${detalleMaterial} ancho ${anchoEnPulgadas(item._id.ancho)}${codigos ? `: ${codigos}` : ""}.`
              : `Quedan solo 2 rollos en reserva de ${detalleMaterial} ancho ${anchoEnPulgadas(item._id.ancho)}${codigos ? `: ${codigos}` : ""}.`,
          referenciaId:
            item.rolloId,
          activa: true
        };

        if (alertaExistente) {
          await Alerta.findByIdAndUpdate(
            alertaExistente._id,
            datosAlerta
          );
        } else {
          await Alerta.create({
            ...datosAlerta,
            clave,
            atendida: false
          });
        }
      }
    }

    await Alerta.updateMany(
      {
        tipo:
          {
            $in: TIPOS_STOCK_RESERVA
          },
        clave: {
          $nin: clavesActivas
        }
      },
      {
        atendida: true,
        activa: false
      }
    );
  };

export const crearAlertaRecepcion =
  async (recepcion) => {
    return await crearAlerta(
      TIPO_RECEPCION_NUEVA,
      `Nueva entrada ${recepcion.codigoRecepcion} registrada con ${recepcion.cantidadRollos} rollo${Number(recepcion.cantidadRollos) === 1 ? "" : "s"} pendiente${Number(recepcion.cantidadRollos) === 1 ? "" : "s"} de clasificacion.`,
      recepcion._id,
      `recepcion-nueva:${recepcion._id}`
    );
  };

export const crearAlertaVentaPendiente =
  async (venta) => {
    return await Alerta.findOneAndUpdate(
      {
        clave:
          `venta-pendiente:${venta._id}`,
      },
      {
        tipo:
          TIPO_VENTA_PENDIENTE,
        mensaje:
          `La venta ${venta.codigoVenta} de ${venta.cliente?.nombre || "cliente"} por ${Number(venta.total || 0).toLocaleString("es-CO")} COP esta pendiente de pago.`,
        referenciaId:
          venta._id,
        atendida:
          false,
        activa:
          true,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  };

export const cerrarAlertaVentaPendiente =
  async (ventaId) => {
    return await Alerta.updateMany(
      {
        clave:
          `venta-pendiente:${ventaId}`,
      },
      {
        atendida:
          true,
        activa:
          false,
      }
    );
  };

export const crearAlertaRevisionVenta =
  async (venta, error) => {
    return await Alerta.findOneAndUpdate(
      {
        clave:
          `venta-revision-cortes:${venta._id}`,
      },
      {
        tipo:
          TIPO_VENTA_REVISION_CORTES,
        mensaje:
          `Revisar la venta ${venta.codigoVenta}: se guardo, pero falto sincronizar cortes/alertas. ${error?.message || ""}`.trim(),
        referenciaId:
          venta._id,
        atendida:
          false,
        activa:
          true,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  };

export const obtenerAlertas =
  async () => {
    return await Alerta.find().sort({
      createdAt: -1,
    });
  };

export const atenderAlerta =
  async (id) => {
    return await Alerta.findByIdAndUpdate(
      id,
      {
        atendida: true,
      },
      {
        new: true,
      }
    );
  };
