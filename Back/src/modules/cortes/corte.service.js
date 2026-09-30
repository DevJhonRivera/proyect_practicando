import mongoose from "mongoose";
import { mongoSoportaTransacciones } from "../../config/db.js";
import Corte from "./corte.model.js";
import Rollo from "../rollos/rollo.model.js";
import PiezaPpf from "../piezasPpf/piezaPpf.model.js";
import Asesoria from "../asesores/asesoria.model.js";
import { crearAlerta }
from "../alertas/alerta.service.js";
import {
  REMANENTE_MINIMO_UTIL,
  consumirRetazo,
} from "../retazos/retazo.service.js";
import {
  esMaterialPpf,
  prepararPiezasPpf,
} from "./cortePpf.utils.js";

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const roundMeters = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const validarMetrosDosDecimales = (value) => {
  const texto =
    String(value ?? "").trim().replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
    throw new Error(
      "Los metros utilizados deben tener maximo 2 decimales"
    );
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error(
      "Ingrese los metros utilizados"
    );
  }

  return numero;
};

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

const prepararDetalleTipoCorte = (data = {}) => {
  const tipoCorte =
    data.tipoCorte || "";
  const detalle =
    normalizarMayusculas(data.tipoCorteDetalle);

  if (tipoCorte === "OTROS" && !detalle) {
    throw new Error("Ingrese el detalle del corte");
  }

  return tipoCorte === "OTROS" ? detalle : "";
};

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

const resolverPiezasPpf = async ({
  piezas = [],
  marca,
  modelo,
  session,
}) => {
  const idsSeleccionados =
    piezas
      .map((pieza) =>
        String(pieza.piezaPpfId || pieza._id || "")
      )
      .filter(Boolean);

  if (
    new Set(idsSeleccionados).size !==
    idsSeleccionados.length
  ) {
    throw new Error(
      "Una pieza PPF no puede agregarse dos veces; aumente su cantidad"
    );
  }

  const ids = [
    ...new Set(
      idsSeleccionados
    ),
  ];
  const piezasCatalogo = ids.length
    ? await PiezaPpf.find({
        _id: { $in: ids },
        activa: { $ne: false },
      }).session(session)
    : [];

  if (piezasCatalogo.length !== ids.length) {
    throw new Error(
      "Una de las piezas PPF seleccionadas ya no esta disponible"
    );
  }

  const catalogoPorId = new Map(
    piezasCatalogo.map((pieza) => [
      String(pieza._id),
      pieza,
    ])
  );
  const piezasResueltas = piezas.map((seleccion) => {
    const id = String(
      seleccion.piezaPpfId || seleccion._id || ""
    );

    if (!id) {
      return seleccion;
    }

    const pieza = catalogoPorId.get(id);

    if (
      normalizarMayusculas(pieza.marca) !==
        normalizarMayusculas(marca) ||
      soloNumeros(pieza.modelo) !== soloNumeros(modelo)
    ) {
      throw new Error(
        `${pieza.pieza} no pertenece a la marca y modelo seleccionados`
      );
    }

    return {
      piezaPpfId: pieza._id,
      pieza: pieza.pieza,
      ubicacion: pieza.ubicacion,
      anchoCm: pieza.anchoCm,
      largoCm: pieza.largoCm,
      cantidad:
        Number(seleccion.cantidad || pieza.cantidad || 1),
      rotada:
        Boolean(seleccion.rotada),
    };
  });

  return prepararPiezasPpf(piezasResueltas);
};

const prepararDetallePpf = async ({
  material,
  corteData,
  session,
}) => {
  if (!esMaterialPpf(material)) {
    return {
      esCortePpf: false,
      piezasPpf: [],
    };
  }

  const piezas = await resolverPiezasPpf({
    piezas: corteData.piezasPpf,
    marca: corteData.marca,
    modelo: corteData.modelo,
    session,
  });

  if (!piezas.length) {
    throw new Error(
      "Seleccione al menos una pieza para el corte PPF"
    );
  }

  return {
    esCortePpf: true,
    tipoCorte: "PIEZAS_PPF",
    tipoCorteDetalle: "",
    piezasPpf: piezas,
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
    let asesoria = null;
    if (data.asesoriaId && data.asesoriaLinea) {
      if (!mongoose.Types.ObjectId.isValid(data.asesoriaId)) {
        throw new Error("La orden de servicio no es valida");
      }
      asesoria = await Asesoria.findById(data.asesoriaId).lean();
      if (!asesoria) throw new Error("La orden de servicio no existe");
      if (!["PENDIENTE_INVENTARIO", "EN_PROCESO"].includes(asesoria.flujo?.etapa)) {
        throw new Error("La orden no esta disponible para registrar cortes");
      }
      if (asesoria.garantia?.esGarantia && asesoria.garantia.estado !== "APROBADA") {
        throw new Error("La garantia debe estar aprobada antes de consumir material");
      }

      const lineasValidas = [
        ...(asesoria.polarizados || []).map((_, index) => `POLARIZADO ${index + 1}`),
        ...(asesoria.ppf || []).map((_, index) => `PPF ${index + 1}`),
      ];
      const lineaNormalizada = normalizarMayusculas(data.asesoriaLinea);
      if (!lineasValidas.includes(lineaNormalizada)) {
        throw new Error("El corte no pertenece a los materiales solicitados en la orden");
      }
      if (normalizarPlaca(data.placa) !== normalizarPlaca(asesoria.vehiculo?.placa)) {
        throw new Error("La placa del corte no coincide con la orden de servicio");
      }

      const corteExistente = await Corte.findOne({
        asesoriaId: data.asesoriaId,
        asesoriaLinea: lineaNormalizada,
      }).select("_id");

      if (corteExistente) {
        throw new Error(
          "Este corte agrupado ya fue registrado para la orden. Edite el corte existente si necesita corregirlo"
        );
      }
    }

    const metrosUtilizados =
      validarMetrosDosDecimales(data.metrosUtilizados);
    const datosVehiculo =
      prepararDatosVehiculo(data);

    const corteData = {
      ...data,
      asesoriaLinea: normalizarMayusculas(data.asesoriaLinea),
      ...datosVehiculo,
      instalador:
        requiereInstalador(data.tipoServicio)
          ? normalizarMayusculas(data.instalador)
          : "",
      tipoCorteDetalle:
        prepararDetalleTipoCorte(data),
      metrosUtilizados:
        roundMeters(metrosUtilizados),
    };

    if (
      requiereInstalador(corteData.tipoServicio) &&
      !corteData.instalador
    ) {
      throw new Error(
        "Ingrese el nombre del instalador"
      );
    }

    const session =
      await mongoose.startSession();
    let corteCreado;
    let rolloConStockBajo;

    try {
      const guardarCorte = async () => {
        if (data.retazoId) {
          const retazo =
            await consumirRetazo(
              corteData.retazoId,
              corteData.metrosUtilizados,
              { session }
            );

          const rentabilidad =
            calcularRentabilidad({
              valorVenta:
                corteData.valorVenta,
              costoMaterialCop:
                Number(retazo.costoPorMetroCop || 0) *
                Number(corteData.metrosUtilizados || 0),
            });
          const detallePpf =
            await prepararDetallePpf({
              material: retazo,
              corteData,
              session,
            });

          [corteCreado] = await Corte.create(
            [
              {
                ...corteData,
                ...rentabilidad,
                ...detallePpf,
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
                      piezasPpf:
                        detallePpf.piezasPpf.length,
                    },
                  }),
                ],
              },
            ],
            { session }
          );

          return;
        }

        const rollo =
          await Rollo.findById(
            corteData.rolloId
          ).session(session);

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

        if (rollo.largoDisponible <= 0) {
          rollo.estado = "AGOTADO";
          rollo.fechaAgotado = rollo.fechaAgotado || new Date();
        }

        await rollo.save({ session });

        const rentabilidad =
          calcularRentabilidad({
            valorVenta:
              corteData.valorVenta,
            costoMaterialCop:
              Number(rollo.costoPorMetroCop || 0) *
              Number(corteData.metrosUtilizados || 0),
          });
        const detallePpf =
          await prepararDetallePpf({
            material: rollo,
            corteData,
            session,
          });

        [corteCreado] = await Corte.create(
          [
            {
              ...corteData,
              ...rentabilidad,
              ...detallePpf,
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
                    piezasPpf:
                      detallePpf.piezasPpf.length,
                  },
                }),
              ],
            },
          ],
          { session }
        );

        if (rollo.largoDisponible <= 3) {
          rolloConStockBajo = {
            _id: rollo._id,
            codigoRollo: rollo.codigoRollo,
          };
        }
      };

      if (mongoSoportaTransacciones()) {
        await session.withTransaction(guardarCorte);
      } else {
        await guardarCorte();
      }
    } finally {
      await session.endSession();
    }

    if (rolloConStockBajo) {
      try {
        await crearAlerta(
          "ROLLO_BAJO",
          `El rollo ${rolloConStockBajo.codigoRollo} tiene menos de 3 metros`,
          rolloConStockBajo._id
        );
      } catch (error) {
        console.error(
          "No fue posible crear la alerta de stock bajo",
          error
        );
      }
    }

    if (corteCreado?.asesoriaId) {
      await Asesoria.findOneAndUpdate({
        _id: corteCreado.asesoriaId,
        "flujo.etapa": { $in: ["PENDIENTE_INVENTARIO", "EN_PROCESO"] },
      }, {
        $set: {
          "flujo.etapa": "EN_PROCESO",
          "flujo.fechaInicioTrabajo": new Date(),
        },
      });
    }

    return corteCreado;
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
    update.tipoCorteDetalle =
      prepararDetalleTipoCorte({
        tipoCorte: data.tipoCorte,
        tipoCorteDetalle:
          data.tipoCorteDetalle ??
          corteActual.tipoCorteDetalle,
      });

    agregarCambio(
      cambios,
      "tipoCorte",
      corteActual.tipoCorte,
      data.tipoCorte
    );
    agregarCambio(
      cambios,
      "tipoCorteDetalle",
      corteActual.tipoCorteDetalle,
      update.tipoCorteDetalle
    );
  } else if (data.tipoCorteDetalle !== undefined) {
    update.tipoCorteDetalle =
      prepararDetalleTipoCorte({
        tipoCorte: corteActual.tipoCorte,
        tipoCorteDetalle: data.tipoCorteDetalle,
      });
    agregarCambio(
      cambios,
      "tipoCorteDetalle",
      corteActual.tipoCorteDetalle,
      update.tipoCorteDetalle
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
