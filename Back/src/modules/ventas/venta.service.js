import Corte from "../cortes/corte.model.js";
import {
  cerrarAlertaVentaPendiente,
  crearAlertaRevisionVenta,
  crearAlertaVentaPendiente,
} from "../alertas/alerta.service.js";
import Venta from "./venta.model.js";

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizarTexto = (value) =>
  String(value || "").trim();

const normalizarMayusculas = (value) =>
  normalizarTexto(value).toUpperCase();

const soloNumeros = (value) =>
  normalizarTexto(value).replace(/\D/g, "");

const normalizarPlaca = (value) =>
  normalizarMayusculas(value);

const obtenerId = (value) =>
  value?._id ? String(value._id) : value ? String(value) : "";

const normalizarIds = (values = []) =>
  values.map(obtenerId).filter(Boolean);

const usuarioAuditoria = (user) => ({
  usuarioId:
    user?._id,
  usuarioNombre:
    user?.nombre || "SISTEMA",
  usuarioRol:
    user?.rol || "",
});

const entradaAuditoria = ({
  accion,
  descripcion,
  user,
  cambios = {},
}) => ({
  fecha:
    new Date(),
  accion,
  descripcion,
  ...usuarioAuditoria(user),
  cambios,
});

const agregarCambio = (cambios, campo, antes, despues) => {
  if (String(antes ?? "") !== String(despues ?? "")) {
    cambios[campo] = {
      antes,
      despues,
    };
  }
};

const cambiosVenta = (antes, despues) => {
  const cambios = {};

  agregarCambio(
    cambios,
    "cliente",
    antes.cliente?.nombre,
    despues.cliente?.nombre
  );
  agregarCambio(
    cambios,
    "telefono",
    antes.cliente?.telefono,
    despues.cliente?.telefono
  );
  agregarCambio(
    cambios,
    "placa",
    antes.vehiculo?.placa,
    despues.vehiculo?.placa
  );
  agregarCambio(
    cambios,
    "marca",
    antes.vehiculo?.marca,
    despues.vehiculo?.marca
  );
  agregarCambio(
    cambios,
    "modelo",
    antes.vehiculo?.modelo,
    despues.vehiculo?.modelo
  );
  agregarCambio(
    cambios,
    "estado",
    antes.estado,
    despues.estado
  );
  agregarCambio(
    cambios,
    "subtotal",
    antes.subtotal,
    despues.subtotal
  );
  agregarCambio(
    cambios,
    "descuento",
    antes.descuento,
    despues.descuento
  );
  agregarCambio(
    cambios,
    "total",
    antes.total,
    despues.total
  );

  return cambios;
};

const calcularRentabilidadCorte = ({
  valorVenta,
  costoMaterialCop,
}) => {
  const venta = Number(valorVenta || 0);
  const costo = Number(costoMaterialCop || 0);
  const utilidad = venta - costo;

  return {
    valorVenta:
      roundMoney(venta),
    utilidadBrutaCop:
      roundMoney(utilidad),
    margenBrutoPorcentaje:
      roundMoney(
        venta > 0
          ? (utilidad / venta) * 100
          : 0
      ),
  };
};

const prepararItems = (items = []) =>
  items.map((item) => {
    const cantidad =
      Math.max(Number(item.cantidad || 1), 1);
    const valorUnitario =
      Number(item.valorUnitario || 0);

    return {
      tipoServicio:
        item.tipoServicio,
      descripcion:
        normalizarMayusculas(item.descripcion),
      corteId:
        obtenerId(item.corteId) || undefined,
      corteIds:
        Array.isArray(item.corteIds)
          ? normalizarIds(item.corteIds)
          : item.corteId
          ? [obtenerId(item.corteId)]
          : [],
      cantidad,
      valorUnitario:
        roundMoney(valorUnitario),
      total:
        roundMoney(cantidad * valorUnitario),
    };
  });

const actualizarCortesVendidos = async (items, venta, user) => {
  await Promise.all(
    items
      .filter((item) => item.corteId || item.corteIds?.length)
      .map(async (item) => {
        const corteIds =
          item.corteIds?.length
            ? item.corteIds
            : [item.corteId];

        const cortes =
          await Corte.find({
            _id: {
              $in: corteIds,
            },
          });

        if (!cortes.length) {
          return;
        }

        const costoTotal =
          cortes.reduce(
            (acc, corte) =>
              acc + Number(corte.costoMaterialCop || 0),
            0
          );

        await Promise.all(
          cortes.map(async (corte) => {
            const factor =
              costoTotal > 0
                ? Number(corte.costoMaterialCop || 0) / costoTotal
                : 1 / cortes.length;

            const valorAsignado =
              roundMoney(Number(item.total || 0) * factor);

            const rentabilidad =
              calcularRentabilidadCorte({
                valorVenta: valorAsignado,
                costoMaterialCop:
                  corte.costoMaterialCop,
              });

            await Corte.findByIdAndUpdate(
              corte._id,
              {
                $set: {
                  valorVenta:
                    rentabilidad.valorVenta,
                  utilidadBrutaCop:
                    rentabilidad.utilidadBrutaCop,
                  margenBrutoPorcentaje:
                    rentabilidad.margenBrutoPorcentaje,
                  ventaId:
                    venta._id,
                  codigoVenta:
                    venta.codigoVenta,
                  ventaEstado:
                    venta.estado,
                },
                $push: {
                  auditoria:
                    entradaAuditoria({
                      accion: "VENTA_ASOCIADA",
                      descripcion:
                        `Corte asociado a ${venta.codigoVenta}`,
                      user,
                      cambios: {
                        valorVenta: {
                          antes:
                            corte.valorVenta,
                          despues:
                            rentabilidad.valorVenta,
                        },
                        codigoVenta:
                          venta.codigoVenta,
                      },
                    }),
                },
              }
            );
          })
        );
      })
  );
};

const limpiarCortesVenta = async (items = [], user) => {
  const corteIds = normalizarIds(
    items.flatMap((item) => [
      item.corteId,
      ...(item.corteIds || []),
    ])
  );

  if (!corteIds.length) {
    return;
  }

  await Corte.updateMany(
    {
      _id: {
        $in: corteIds,
      },
    },
    {
      $set: {
        valorVenta: 0,
        utilidadBrutaCop: 0,
        margenBrutoPorcentaje: 0,
      },
      $unset: {
        ventaId: "",
        codigoVenta: "",
        ventaEstado: "",
      },
      $push: {
        auditoria:
          entradaAuditoria({
            accion: "VENTA_DESASOCIADA",
            descripcion:
              "Relacion de venta limpiada por edicion",
            user,
          }),
      },
    }
  );
};

const sincronizarAlertaVenta = async (venta) => {
  if (venta.estado === "PENDIENTE") {
    await crearAlertaVentaPendiente(venta);
    return;
  }

  await cerrarAlertaVentaPendiente(venta._id);
};

const registrarErrorPostVenta = async (venta, error) => {
  console.error(
    "Error sincronizando informacion secundaria de venta",
    error
  );

  try {
    await crearAlertaRevisionVenta(venta, error);
  } catch (alertaError) {
    console.error(
      "No fue posible crear alerta de revision de venta",
      alertaError
    );
  }
};

const prepararVenta = async (data, ventaActual = null) => {
  const cliente = {
    nombre:
      normalizarMayusculas(data.cliente?.nombre),
    telefono:
      normalizarTexto(data.cliente?.telefono),
  };

  const vehiculo = {
    placa:
      normalizarPlaca(data.vehiculo?.placa),
    marca:
      normalizarMayusculas(data.vehiculo?.marca),
    modelo:
      soloNumeros(data.vehiculo?.modelo),
  };

  if (!cliente.nombre) {
    throw new Error("Ingrese el nombre del cliente");
  }

  const items =
    prepararItems(data.items);

  const itemConCorte =
    items.find((item) => item.corteId || item.corteIds?.length);

  if (
    itemConCorte &&
    (!vehiculo.placa || !vehiculo.marca || !vehiculo.modelo)
  ) {
    const corte =
      await Corte.findById(
        itemConCorte.corteId || itemConCorte.corteIds[0]
      );

    if (corte) {
      vehiculo.placa =
        vehiculo.placa || normalizarPlaca(corte.placa);
      vehiculo.marca =
        vehiculo.marca || normalizarMayusculas(corte.marca);
      vehiculo.modelo =
        vehiculo.modelo || soloNumeros(corte.modelo);
    }
  }

  if (!vehiculo.placa || !vehiculo.marca || !vehiculo.modelo) {
    throw new Error("Complete los datos del vehiculo");
  }

  if (!items.length) {
    throw new Error(
      "Debe agregar al menos un servicio"
    );
  }

  const itemInvalido =
    items.find(
      (item) =>
        !item.tipoServicio ||
        !item.descripcion ||
        item.valorUnitario < 0
    );

  if (itemInvalido) {
    throw new Error(
      "Complete tipo, descripcion y valor de cada servicio"
    );
  }

  const subtotal =
    roundMoney(
      items.reduce(
        (acc, item) => acc + Number(item.total || 0),
        0
      )
    );

  const descuento =
    roundMoney(data.descuento || 0);

  const total =
    roundMoney(Math.max(subtotal - descuento, 0));

  return {
    codigoVenta:
      ventaActual?.codigoVenta || `VEN-${Date.now()}`,
    cliente,
    vehiculo,
    estado:
      data.estado || ventaActual?.estado || "PENDIENTE",
    items,
    subtotal,
    descuento,
    total,
    observaciones:
      normalizarMayusculas(data.observaciones),
  };
};

export const crearVenta = async (data, user) => {
  const ventaData =
    await prepararVenta(data);

  const venta =
    await Venta.create({
      ...ventaData,
      auditoria: [
        entradaAuditoria({
          accion: "CREACION",
          descripcion: "Venta registrada",
          user,
          cambios: {
            total:
              ventaData.total,
            estado:
              ventaData.estado,
          },
        }),
      ],
    });

  try {
    await actualizarCortesVendidos(ventaData.items, venta, user);
    await sincronizarAlertaVenta(venta);
  } catch (error) {
    await registrarErrorPostVenta(venta, error);
  }

  return venta;
};

export const obtenerVentas = async () => {
  return await Venta.find()
    .populate("items.corteId")
    .populate("items.corteIds")
    .sort({
      createdAt: -1,
    });
};

export const obtenerVentaPorId = async (id) => {
  return await Venta.findById(id)
    .populate("items.corteId")
    .populate("items.corteIds");
};

export const actualizarEstadoVenta =
  async (id, estado, user) => {
    const ventaActual =
      await Venta.findById(id);

    if (!ventaActual) {
      throw new Error("Venta no encontrada");
    }

    const venta =
      await Venta.findByIdAndUpdate(
        id,
        {
          $set: {
            estado,
          },
          $push: {
            auditoria:
              entradaAuditoria({
                accion: "CAMBIO_ESTADO",
                descripcion:
                  `Estado cambiado a ${estado}`,
                user,
                cambios: {
                  estado: {
                    antes:
                      ventaActual.estado,
                    despues:
                      estado,
                  },
                },
              }),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    try {
      await Corte.updateMany(
        {
          ventaId:
            venta._id,
        },
        {
          $set: {
            ventaEstado:
              venta.estado,
          },
          $push: {
            auditoria:
              entradaAuditoria({
                accion: "CAMBIO_ESTADO_VENTA",
                descripcion:
                  `Estado de venta cambiado a ${venta.estado}`,
                user,
                cambios: {
                  estado: {
                    antes:
                      ventaActual.estado,
                    despues:
                      venta.estado,
                  },
                },
              }),
          },
        }
      );

      await sincronizarAlertaVenta(venta);
    } catch (error) {
      await registrarErrorPostVenta(venta, error);
    }

    return venta;
  };

export const actualizarVenta = async (id, data, user) => {
  const ventaActual =
    await Venta.findById(id);

  if (!ventaActual) {
    throw new Error("Venta no encontrada");
  }

  const ventaData =
    await prepararVenta(data, ventaActual);
  const cambios =
    cambiosVenta(ventaActual, ventaData);

  await limpiarCortesVenta(ventaActual.items, user);

  const venta =
    await Venta.findByIdAndUpdate(
      id,
      {
        $set: ventaData,
        $push: {
          auditoria:
            entradaAuditoria({
              accion: "EDICION",
              descripcion: "Venta editada",
              user,
              cambios,
            }),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("items.corteId")
      .populate("items.corteIds");

  try {
    await actualizarCortesVendidos(ventaData.items, venta, user);
    await sincronizarAlertaVenta(venta);
  } catch (error) {
    await registrarErrorPostVenta(venta, error);
  }

  return venta;
};
