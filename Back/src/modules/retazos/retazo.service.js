import Retazo from "./retazo.model.js";

export const REMANENTE_MINIMO_UTIL =
  0.4;

const TOLERANCIA_RETAZO_METROS = 0.1;
const TOLERANCIA_RETAZO_PULGADAS =
  10 / 2.54;

const roundMeters = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const crearRetazo = async (data) => {
  const largo =
    roundMeters(data.largoDisponible || data.largoOriginal);

  if (largo <= 0) {
    throw new Error(
      "El largo del retazo debe ser mayor a 0"
    );
  }

  return await Retazo.create({
    codigoRetazo:
      data.codigoRetazo ||
      `RET-${Date.now()}`,
    tipoPolarizado:
      data.tipoPolarizado,
    porcentaje:
      Number(data.porcentaje),
    unidadMedida:
      data.unidadMedida || "PORCENTAJE",
    ancho:
      Number(data.ancho),
    largoOriginal:
      roundMeters(data.largoOriginal || largo),
    largoDisponible:
      largo,
    costoPorMetroCop:
      Number(data.costoPorMetroCop || 0),
    costoTotalCop:
      Number(
        data.costoTotalCop ||
          Number(data.costoPorMetroCop || 0) * largo
      ),
    origenRolloId:
      data.origenRolloId,
    origenCorteId:
      data.origenCorteId,
    observaciones:
      data.observaciones || "",
  });
};

export const obtenerRetazos = async () => {
  return await Retazo.find()
    .populate("origenRolloId")
    .populate("origenCorteId")
    .sort({
      createdAt: -1,
    });
};

export const obtenerRetazosDisponibles =
  async () => {
    return await Retazo.find({
      estado: "DISPONIBLE",
      largoDisponible: {
        $gt: 0,
      },
    }).sort({
      largoDisponible: 1,
    });
  };

export const buscarRetazoCompatible =
  async ({
    tipoPolarizado,
    porcentaje,
    unidadMedida = "PORCENTAJE",
    ancho,
    metrosUtilizados,
  }) => {
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

    const anchoMinimo =
      Math.max(
        0,
        Number(ancho || 0) - TOLERANCIA_RETAZO_PULGADAS
      );
    const largoMinimo =
      Math.max(
        0,
        Number(metrosUtilizados || 0) - TOLERANCIA_RETAZO_METROS
      );

    return await Retazo.findOne({
      estado: "DISPONIBLE",
      tipoPolarizado,
      porcentaje: Number(porcentaje),
      ...filtroUnidad,
      ancho: {
        $gte: anchoMinimo,
      },
      largoDisponible: {
        $gte: largoMinimo,
      },
    }).sort({
      largoDisponible: 1,
      ancho: 1,
    });
  };

export const consumirRetazo =
  async (id, metrosUtilizados) => {
    const retazo =
      await Retazo.findById(id);

    if (!retazo) {
      throw new Error("Retazo no encontrado");
    }

    if (retazo.estado !== "DISPONIBLE") {
      throw new Error("El retazo no esta disponible");
    }

    const metrosSolicitados =
      Number(metrosUtilizados || 0);
    const largoDisponible =
      Number(retazo.largoDisponible || 0);

    if (
      largoDisponible + TOLERANCIA_RETAZO_METROS <
      metrosSolicitados
    ) {
      throw new Error(
        "El retazo no tiene medida suficiente, ni con la tolerancia de 10 cm"
      );
    }

    retazo.largoDisponible =
      roundMeters(
        Math.max(
          largoDisponible - metrosSolicitados,
          0
        )
      );

    if (
      retazo.largoDisponible <=
      REMANENTE_MINIMO_UTIL
    ) {
      retazo.largoDisponible = 0;
      retazo.estado = "USADO";
    }

    await retazo.save();

    return retazo;
  };

export const descartarRetazo = async (id) => {
  const retazo =
    await Retazo.findByIdAndUpdate(
      id,
      {
        estado: "DESCARTADO",
        largoDisponible: 0,
      },
      {
        new: true,
      }
    );

  if (!retazo) {
    throw new Error("Retazo no encontrado");
  }

  return retazo;
};
