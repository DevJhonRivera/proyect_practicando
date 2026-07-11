import Corte from "./corte.model.js";
import Rollo from "../rollos/rollo.model.js";
import { crearAlerta }
from "../alertas/alerta.service.js";
import {
  REMANENTE_MINIMO_UTIL,
  consumirRetazo,
} from "../retazos/retazo.service.js";

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const roundMeters = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizarTexto = (value) =>
  String(value || "").trim();

const normalizarMayusculas = (value) =>
  normalizarTexto(value).toUpperCase();

const soloNumeros = (value) =>
  normalizarTexto(value).replace(/\D/g, "");

const normalizarPlaca = (value) =>
  normalizarMayusculas(value);

const requiereInstalador = (tipoServicio) =>
  tipoServicio === "GARANTIA_INSTALADOR";

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

const escapeRegex = (value) =>
  normalizarTexto(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const regexExacto = (value) =>
  new RegExp(`^${escapeRegex(value)}$`, "i");

const prepararDatosVehiculo = (data) => {
  const marca =
    normalizarMayusculas(data.marca);
  const modelo =
    soloNumeros(data.modelo);
  const placa =
    normalizarPlaca(data.placa);

  if (!marca) {
    throw new Error("Ingrese la marca del vehiculo");
  }

  if (!modelo) {
    throw new Error("Ingrese el modelo del vehiculo");
  }

  if (!placa) {
    throw new Error("Ingrese la placa del vehiculo");
  }

  return {
    marca,
    modelo,
    placa
  };
};

const calcularRentabilidad = ({
  valorVenta,
  costoMaterialCop,
}) => {
  const tieneVenta =
    valorVenta !== undefined &&
    valorVenta !== null &&
    valorVenta !== "";
  const venta =
    tieneVenta
      ? Number(valorVenta || 0)
      : 0;
  const costo =
    Number(costoMaterialCop || 0);
  const utilidad =
    tieneVenta && venta > 0
      ? venta - costo
      : 0;

  return {
    valorVenta:
      roundMoney(venta),
    costoMaterialCop:
      roundMoney(costo),
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

export const registrarCorte =
  async (data, user) => {
    const datosVehiculo =
      prepararDatosVehiculo(data);

    const corteData = {
      ...data,
      ...datosVehiculo,
      instalador:
        requiereInstalador(data.tipoServicio)
          ? normalizarMayusculas(data.instalador)
          : "",
      metrosUtilizados:
        roundMeters(data.metrosUtilizados),
    };

    if (
      requiereInstalador(corteData.tipoServicio) &&
      !corteData.instalador
    ) {
      throw new Error(
        "Ingrese el nombre del instalador"
      );
    }

    if (data.retazoId) {
      const retazo =
        await consumirRetazo(
          corteData.retazoId,
          corteData.metrosUtilizados
        );

      const rentabilidad =
        calcularRentabilidad({
          valorVenta:
            corteData.valorVenta,
          costoMaterialCop:
            Number(retazo.costoPorMetroCop || 0) *
            Number(corteData.metrosUtilizados || 0),
        });

      return await Corte.create({
        ...corteData,
        ...rentabilidad,
        retazoId: retazo._id,
        rolloId: undefined,
        origenMaterial: "RETAZO",
        auditoria: [
          entradaAuditoria({
            accion: "CREACION",
            descripcion: "Corte registrado",
            user,
            cambios: {
              metrosUtilizados:
                corteData.metrosUtilizados,
              costoMaterialCop:
                rentabilidad.costoMaterialCop,
            },
          }),
        ],
      });
    }

    const rollo =
      await Rollo.findById(
        corteData.rolloId
      );

    if (!rollo) {
      throw new Error(
        "Rollo no encontrado"
      );
    }

    if (rollo.estado !== "USO") {
      throw new Error(
        "El rollo no está en uso"
      );
    }

    if (
      rollo.largoDisponible <
      corteData.metrosUtilizados
    ) {
      throw new Error(
        "Material insuficiente"
      );
    }

    rollo.largoDisponible =
      roundMeters(
        Number(rollo.largoDisponible || 0) -
          Number(corteData.metrosUtilizados || 0)
      );

    let remanenteDescartado = 0;

    if (
      corteData.agotarRemanente &&
      rollo.largoDisponible > 0 &&
          rollo.largoDisponible <=
        REMANENTE_MINIMO_UTIL
    ) {
      remanenteDescartado =
        roundMeters(rollo.largoDisponible);
      rollo.largoDisponible = 0;
      rollo.estado = "AGOTADO";
    }

    if (
      rollo.largoDisponible <= 0
    ) {
      rollo.estado = "AGOTADO";
    }

    await rollo.save();

    const rentabilidad =
      calcularRentabilidad({
        valorVenta:
          corteData.valorVenta,
        costoMaterialCop:
          Number(rollo.costoPorMetroCop || 0) *
          Number(corteData.metrosUtilizados || 0),
      });

    const corte = await Corte.create({
      ...corteData,
      ...rentabilidad,
      origenMaterial: "ROLLO",
      remanenteDescartado,
      auditoria: [
        entradaAuditoria({
          accion: "CREACION",
          descripcion: "Corte registrado",
          user,
          cambios: {
            metrosUtilizados:
              corteData.metrosUtilizados,
            costoMaterialCop:
              rentabilidad.costoMaterialCop,
          },
        }),
      ],
    });

    if (
      rollo.largoDisponible <= 3
    ) {
      await crearAlerta(
        "ROLLO_BAJO",
        `El rollo ${rollo.codigoRollo} tiene menos de 3 metros`,
        rollo._id
      );
    }

    return corte;
  };


export const obtenerCortes =async () => {
    return await Corte.find()
      .populate("rolloId")
      .populate("retazoId")
      .populate("ventaId")
      .sort({
        createdAt: -1,
      });
  };

export const actualizarCorte = async (id, data, user) => {
  const corteActual =
    await Corte.findById(id);

  if (!corteActual) {
    throw new Error("Corte no encontrado");
  }

  const datosVehiculo =
    prepararDatosVehiculo({
      marca:
        data.marca ?? corteActual.marca,
      modelo:
        data.modelo ?? corteActual.modelo,
      placa:
        data.placa ?? corteActual.placa,
    });

  const update = {
    ...datosVehiculo,
    instalador:
      normalizarMayusculas(data.instalador ?? corteActual.instalador),
  };
  const cambios = {};

  agregarCambio(
    cambios,
    "placa",
    corteActual.placa,
    datosVehiculo.placa
  );
  agregarCambio(
    cambios,
    "marca",
    corteActual.marca,
    datosVehiculo.marca
  );
  agregarCambio(
    cambios,
    "modelo",
    corteActual.modelo,
    datosVehiculo.modelo
  );

  if (data.tipoServicio) {
    update.tipoServicio = data.tipoServicio;
    agregarCambio(
      cambios,
      "tipoServicio",
      corteActual.tipoServicio,
      data.tipoServicio
    );
  }

  if (!requiereInstalador(update.tipoServicio || corteActual.tipoServicio)) {
    update.instalador = "";
  }

  if (
    requiereInstalador(update.tipoServicio || corteActual.tipoServicio) &&
    !update.instalador
  ) {
    throw new Error(
      "Ingrese el nombre del instalador"
    );
  }

  agregarCambio(
    cambios,
    "instalador",
    corteActual.instalador,
    update.instalador
  );

  if (data.tipoCorte) {
    update.tipoCorte = data.tipoCorte;
    agregarCambio(
      cambios,
      "tipoCorte",
      corteActual.tipoCorte,
      data.tipoCorte
    );
  }

  if (
    data.valorVenta !== undefined &&
    data.valorVenta !== null &&
    data.valorVenta !== ""
  ) {
    const rentabilidad =
      calcularRentabilidad({
        valorVenta:
          data.valorVenta,
        costoMaterialCop:
          corteActual.costoMaterialCop,
      });

    agregarCambio(
      cambios,
      "valorVenta",
      corteActual.valorVenta,
      rentabilidad.valorVenta
    );

    Object.assign(
      update,
      rentabilidad
    );
  }

  return await Corte.findByIdAndUpdate(
    id,
    {
      $set: update,
      $push: {
        auditoria:
          entradaAuditoria({
            accion: "EDICION",
            descripcion: "Corte editado",
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
    .populate("rolloId")
    .populate("retazoId")
    .populate("ventaId");
};

export const obtenerSugerenciasCortes =
  async ({ marca, modelo, tipoCorte }) => {
    const marcaNormalizada =
      normalizarTexto(marca);
    const modeloNormalizado =
      normalizarTexto(modelo);
    const tipoCorteNormalizado =
      normalizarTexto(tipoCorte);

    if (
      !marcaNormalizada ||
      !modeloNormalizado ||
      !tipoCorteNormalizado
    ) {
      return [];
    }

    const cortes =
      await Corte.find({
        marca: regexExacto(marcaNormalizada),
        modelo: regexExacto(modeloNormalizado),
        tipoCorte: tipoCorteNormalizado,
      })
        .populate("rolloId")
        .populate("retazoId")
        .sort({
          createdAt: -1,
        })
        .limit(40)
        .lean();

    const sugerencias = new Map();

    cortes.forEach((corte) => {
      const key =
        corte.tipoCorte || "OTROS";

      const actual =
        sugerencias.get(key) || {
          tipoCorte: key,
          cantidad: 0,
          totalMetros: 0,
          ultimoCorte: corte,
          servicios: new Set(),
          placas: new Set(),
          materiales: new Set(),
          ejemplos: [],
        };

      actual.cantidad += 1;
      actual.totalMetros +=
        Number(corte.metrosUtilizados || 0);

      if (corte.tipoServicio) {
        actual.servicios.add(corte.tipoServicio);
      }

      if (corte.placa) {
        actual.placas.add(corte.placa);
      }

      const material =
        corte.origenMaterial === "RETAZO"
          ? corte.retazoId?.codigoRetazo
          : corte.rolloId?.codigoRollo;

      if (material) {
        actual.materiales.add(material);
      }

      if (actual.ejemplos.length < 3) {
        actual.ejemplos.push(corte);
      }

      sugerencias.set(key, actual);
    });

    return Array.from(sugerencias.values())
      .map((item) => ({
        tipoCorte: item.tipoCorte,
        cantidad: item.cantidad,
        promedioMetros:
          item.cantidad > 0
            ? roundMoney(item.totalMetros / item.cantidad)
            : 0,
        ultimoCorte: item.ultimoCorte,
        servicios:
          Array.from(item.servicios),
        placas:
          Array.from(item.placas).slice(0, 5),
        materiales:
          Array.from(item.materiales).slice(0, 5),
        ejemplos:
          item.ejemplos,
      }))
      .sort(
        (a, b) =>
          b.cantidad - a.cantidad ||
          new Date(b.ultimoCorte?.createdAt || 0) -
            new Date(a.ultimoCorte?.createdAt || 0)
      );
  };
