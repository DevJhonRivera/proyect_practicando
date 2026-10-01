import Alerta from "./alerta.model.js";
import Rollo from "../rollos/rollo.model.js";

export const TIPO_STOCK_RESERVA_UN_ROLLO =
  "STOCK_RESERVA_UN_ROLLO";
export const TIPO_STOCK_RESERVA_DOS_ROLLOS =
  "STOCK_RESERVA_DOS_ROLLOS";
export const TIPO_RECEPCION_NUEVA =
  "RECEPCION_NUEVA";
export const TIPO_SERVICIO_ASESOR_NUEVO =
  "SERVICIO_ASESOR_NUEVO";
export const TIPO_SERVICIO_LISTO_PAGO =
  "SERVICIO_LISTO_PAGO";
export const TIPO_VENTA_PENDIENTE =
  "VENTA_PENDIENTE";
export const TIPO_VENTA_REVISION_CORTES =
  "VENTA_REVISION_CORTES";
export const TIPO_SOLICITUD_NOVEDAD =
  "SOLICITUD_NOVEDAD";
export const TIPO_SOLICITUD_GARANTIA =
  "SOLICITUD_GARANTIA";
export const TIPO_COORDINACION_NUEVA = "COORDINACION_NUEVA";
export const TIPO_PROPUESTA_CORTE = "PROPUESTA_CORTE";
export const TIPO_MATERIAL_LISTO = "MATERIAL_LISTO";
export const TIPO_ASIGNACION_TRABAJO = "ASIGNACION_TRABAJO";
export const TIPO_INSTALACION_COMPLETA = "INSTALACION_COMPLETA";

const TIPOS_STOCK_RESERVA = [
  TIPO_STOCK_RESERVA_UN_ROLLO,
  TIPO_STOCK_RESERVA_DOS_ROLLOS
];

const TIPOS_INVENTARIO = [
  TIPO_STOCK_RESERVA_UN_ROLLO,
  TIPO_STOCK_RESERVA_DOS_ROLLOS,
  TIPO_RECEPCION_NUEVA,
  TIPO_PROPUESTA_CORTE,
  TIPO_SERVICIO_ASESOR_NUEVO
];

const TIPOS_COORDINACION = [TIPO_COORDINACION_NUEVA, TIPO_MATERIAL_LISTO, TIPO_INSTALACION_COMPLETA];

const TIPOS_VENTAS = [
  TIPO_VENTA_PENDIENTE,
  TIPO_VENTA_REVISION_CORTES,
  TIPO_SERVICIO_LISTO_PAGO
];

const rolesConTodasLasAlertas = [
  "SUPERUSUARIO",
  "ADMIN"
];

const tiposPermitidosPorRol = (rol) => {
  if (rolesConTodasLasAlertas.includes(rol)) {
    return null;
  }

  if (rol === "INVENTARIO") {
    return TIPOS_INVENTARIO;
  }

  if (rol === "VENTAS") {
    return TIPOS_VENTAS;
  }

  if (rol === "COORDINADOR") return TIPOS_COORDINACION;
  if (rol === "INSTALADOR") return [TIPO_ASIGNACION_TRABAJO];

  return [];
};

const filtroAlertasPorRol = (user) => {
  const tiposPermitidos =
    tiposPermitidosPorRol(user?.rol);

  if (tiposPermitidos === null) {
    return {};
  }

  return {
    tipo: {
      $in: tiposPermitidos
    },
    ...(user?.rol === "INSTALADOR" ? { destinatarioId: user._id } : {}),
  };
};

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

export const crearAlertaServicioAsesor = async (asesoria) => {
  const placa = asesoria.vehiculo?.placa || "SIN PLACA";
  return Alerta.findOneAndUpdate(
    { clave: `servicio-asesor:${asesoria._id}` },
    {
      mensaje: `Nuevo servicio ${asesoria.codigo} para ${placa}. Prepare la propuesta de corte y asigne instaladores.`,
      referenciaId: asesoria._id,
      accionUrl: `/coordinacion?asesoria=${asesoria._id}`,
      tipo: TIPO_COORDINACION_NUEVA,
      atendida: false,
      activa: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

export const crearAlertaInventarioCorte = async (asesoria) =>
  Alerta.findOneAndUpdate(
    { clave: `corte-aprobado:${asesoria._id}` },
    {
      tipo: TIPO_SERVICIO_ASESOR_NUEVO,
      mensaje: `Propuesta aprobada para ${asesoria.codigo} (${asesoria.vehiculo?.placa || ""}). Realice los cortes indicados.`,
      referenciaId: asesoria._id,
      accionUrl: `/cortes?asesoria=${asesoria._id}`,
      atendida: false,
      activa: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

export const crearAlertaPropuestaCorte = async (asesoria) =>
  Alerta.findOneAndUpdate(
    { clave: `propuesta-corte:${asesoria._id}` },
    {
      tipo: TIPO_PROPUESTA_CORTE,
      mensaje: `Revisar propuesta de corte ${asesoria.codigo} para ${asesoria.vehiculo?.placa || ""}.`,
      referenciaId: asesoria._id,
      accionUrl: `/cortes?asesoria=${asesoria._id}`,
      atendida: false,
      activa: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

export const crearAlertaMaterialListo = async (asesoria) =>
  Alerta.findOneAndUpdate(
    { clave: `material-listo:${asesoria._id}` },
    {
      tipo: TIPO_MATERIAL_LISTO,
      mensaje: `Los cortes de ${asesoria.codigo} (${asesoria.vehiculo?.placa || ""}) están listos para recoger.`,
      referenciaId: asesoria._id,
      accionUrl: `/coordinacion?asesoria=${asesoria._id}`,
      atendida: false,
      activa: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

export const crearAlertasInstaladores = async (asesoria) => {
  const asignaciones = asesoria.coordinacion?.asignaciones || [];
  await Promise.all(asignaciones.map((asignacion) =>
    Alerta.findOneAndUpdate(
      { clave: `asignacion:${asesoria._id}:${asignacion._id}` },
      {
        tipo: TIPO_ASIGNACION_TRABAJO,
        mensaje: `Trabajo asignado: ${asignacion.servicio} para ${asesoria.vehiculo?.placa || ""}.`,
        referenciaId: asesoria._id,
        destinatarioId: asignacion.instaladorId,
        accionUrl: "/coordinacion",
        atendida: false,
        activa: true,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
  ));
};

export const crearAlertaInstalacionCompleta = async (asesoria) =>
  Alerta.findOneAndUpdate(
    { clave: `instalacion-completa:${asesoria._id}` },
    {
      tipo: TIPO_INSTALACION_COMPLETA,
      mensaje: `Todos los trabajos de ${asesoria.codigo} (${asesoria.vehiculo?.placa || ""}) fueron completados. Puede enviarlo a Ventas.`,
      referenciaId: asesoria._id,
      accionUrl: `/coordinacion?asesoria=${asesoria._id}`,
      atendida: false,
      activa: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

export const cerrarAlertaFlujo = async (clave) =>
  Alerta.updateMany({ clave }, { atendida: true, activa: false });

export const crearAlertaServicioListoPago = async (asesoria) =>
  Alerta.findOneAndUpdate(
    { clave: `servicio-listo-pago:${asesoria._id}` },
    {
      tipo: TIPO_SERVICIO_LISTO_PAGO,
      mensaje: `El servicio ${asesoria.codigo} del vehiculo ${asesoria.vehiculo?.placa || ""} esta listo para registrar el pago.`,
      referenciaId: asesoria._id,
      accionUrl: `/ventas?asesoria=${asesoria._id}`,
      atendida: false,
      activa: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

export const crearAlertaSolicitudNovedad = async (asesoria, novedad) =>
  Alerta.findOneAndUpdate(
    { clave: `solicitud-novedad:${asesoria._id}:${novedad._id}` },
    {
      tipo: TIPO_SOLICITUD_NOVEDAD,
      mensaje: `Inventario reportó ${String(novedad.tipo || "una novedad").replaceAll("_", " ")} en el servicio ${asesoria.codigo} del vehículo ${asesoria.vehiculo?.placa || ""}.`,
      referenciaId: asesoria._id,
      accionUrl: "/asesores",
      atendida: false,
      activa: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

export const crearAlertaSolicitudGarantia = async (asesoria) =>
  Alerta.findOneAndUpdate(
    { clave: `solicitud-garantia:${asesoria._id}` },
    {
      tipo: TIPO_SOLICITUD_GARANTIA,
      mensaje: `Revisar garantía ${asesoria.codigo} del vehículo ${asesoria.vehiculo?.placa || ""}: ${asesoria.garantia?.motivo || "SIN MOTIVO"}.`,
      referenciaId: asesoria._id,
      accionUrl: "/asesores",
      atendida: false,
      activa: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

export const cerrarAlertaSolicitudGarantia = async (asesoriaId) =>
  Alerta.updateMany(
    { clave: `solicitud-garantia:${asesoriaId}` },
    { atendida: true, activa: false }
  );

export const cerrarAlertaSolicitudNovedad = async (asesoriaId, novedadId) =>
  Alerta.updateMany(
    { clave: `solicitud-novedad:${asesoriaId}:${novedadId}` },
    { atendida: true, activa: false }
  );

export const cerrarAlertaServicioListoPago = async (asesoriaId) =>
  Alerta.updateMany(
    { clave: `servicio-listo-pago:${asesoriaId}` },
    { atendida: true, activa: false }
  );

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
          `La venta ${venta.codigoVenta} de ${venta.cliente?.nombre || "cliente"} tiene un saldo pendiente de ${Number(venta.saldoPendiente ?? venta.total ?? 0).toLocaleString("es-CO")} COP.`,
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
  async (user) => {
    return await Alerta.find(
      filtroAlertasPorRol(user)
    ).sort({
      createdAt: -1,
    });
  };

export const atenderAlerta =
  async (id, user) => {
    return await Alerta.findOneAndUpdate(
      {
        _id: id,
        ...filtroAlertasPorRol(user)
      },
      {
        atendida: true,
      },
      {
        new: true,
      }
    );
  };
