import Rollo from "../rollos/rollo.model.js";
import Retazo from "../retazos/retazo.model.js";

const redondearMetros = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const obtenerCatalogoDisponible = async () => {
  const [rollos, retazos] = await Promise.all([
    Rollo.find({
      estado: { $in: ["RESERVA", "USO"] },
      largoDisponible: { $gt: 0 },
    })
      .select("tipoPolarizado porcentaje unidadMedida ancho largoDisponible estado")
      .lean(),
    Retazo.find({
      estado: "DISPONIBLE",
      largoDisponible: { $gt: 0 },
    })
      .select("tipoPolarizado porcentaje unidadMedida ancho largoDisponible")
      .lean(),
  ]);

  const grupos = new Map();

  const agregarMaterial = (rollo, tipo) => {
    const key = [
      rollo.tipoPolarizado,
      rollo.unidadMedida || "PORCENTAJE",
      Number(rollo.porcentaje || 0),
      Number(rollo.ancho || 0),
    ].join("|");
    const actual = grupos.get(key) || {
      tipoPolarizado: rollo.tipoPolarizado,
      porcentaje: Number(rollo.porcentaje || 0),
      unidadMedida: rollo.unidadMedida || "PORCENTAJE",
      ancho: Number(rollo.ancho || 0),
      cantidadRollos: 0,
      cantidadRetazos: 0,
      metrosDisponibles: 0,
      enReserva: 0,
      enUso: 0,
    };

    if (tipo === "ROLLO") {
      actual.cantidadRollos += 1;
      actual.enReserva += rollo.estado === "RESERVA" ? 1 : 0;
      actual.enUso += rollo.estado === "USO" ? 1 : 0;
    } else {
      actual.cantidadRetazos += 1;
    }
    actual.metrosDisponibles += Number(rollo.largoDisponible || 0);
    grupos.set(key, actual);
  };

  rollos.forEach((rollo) => agregarMaterial(rollo, "ROLLO"));
  retazos.forEach((retazo) => agregarMaterial(retazo, "RETAZO"));

  return Array.from(grupos.values())
    .map((grupo) => ({
      ...grupo,
      metrosDisponibles: redondearMetros(grupo.metrosDisponibles),
    }))
    .sort((a, b) =>
      String(a.tipoPolarizado).localeCompare(String(b.tipoPolarizado))
    );
};
