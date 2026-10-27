import ServicioAdicional from "./servicioAdicional.model.js";

const CATEGORIAS = ["LAVADO", "POLICHADA", "DETAILING", "PDR", "PINTURA", "ASEGURADA", "OTRO"];
const PREDETERMINADOS = [
  ["LAVADO", "LAVADO GENERAL"],
  ["POLICHADA", "POLICHADA GENERAL"],
  ["DETAILING", "DETAILING GENERAL"],
  ["PDR", "PDR"],
  ["PINTURA", "PINTURA"],
  ["ASEGURADA", "ASEGURADA GENERAL"],
];
const mayusculas = (value) => String(value || "").trim().toUpperCase();

const asegurarPredeterminados = async () => {
  const operaciones = PREDETERMINADOS.map(([categoria, nombre]) => ({
    updateOne: {
      filter: { categoria, nombre },
      update: { $setOnInsert: { categoria, nombre, creadoPorNombre: "SISTEMA" } },
      upsert: true,
    },
  }));
  await ServicioAdicional.bulkWrite(operaciones, { ordered: false });
};

export const listarServiciosAdicionales = async () => {
  await asegurarPredeterminados();
  return ServicioAdicional.find({ activo: { $ne: false } }).sort({ categoria: 1, nombre: 1 }).lean();
};

export const crearServicioAdicional = async (data, user) => {
  const categoria = mayusculas(data.categoria);
  const nombre = mayusculas(data.nombre);
  const precioSugerido = Number(data.precioSugerido || 0);
  if (!CATEGORIAS.includes(categoria)) throw new Error("Seleccione una categoría válida");
  if (nombre.length < 3) throw new Error("Ingrese el nombre del servicio");
  if (!Number.isFinite(precioSugerido) || precioSugerido < 0) throw new Error("Ingrese un precio sugerido válido");

  const existente = await ServicioAdicional.findOne({ categoria, nombre });
  if (existente) {
    if (existente.activo) throw new Error("Este servicio ya existe en el catálogo");
    existente.activo = true;
    existente.precioSugerido = precioSugerido;
    existente.creadoPorId = user._id;
    existente.creadoPorNombre = user.nombre || user.rol;
    return existente.save();
  }
  return ServicioAdicional.create({ categoria, nombre, precioSugerido, creadoPorId: user._id, creadoPorNombre: user.nombre || user.rol });
};

export const eliminarServicioAdicional = async (id) => {
  const servicio = await ServicioAdicional.findByIdAndUpdate(id, { activo: false }, { new: true });
  if (!servicio) throw new Error("Servicio no encontrado");
  return servicio;
};
