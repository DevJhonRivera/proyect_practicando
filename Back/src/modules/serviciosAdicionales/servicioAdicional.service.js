import ServicioAdicional from "./servicioAdicional.model.js";

const CATEGORIAS = ["LAVADO", "POLICHADA", "DETAILING", "PDR", "PINTURA", "ASEGURADA", "INSTALACIONES", "OTRO"];
const PREDETERMINADOS = [
  ["LAVADO", "LAVADO GENERAL"],
  ["POLICHADA", "POLICHADA GENERAL"],
  ["DETAILING", "DETAILING GENERAL"],
  ["PDR", "PDR"],
  ["PINTURA", "PINTURA"],
  ["ASEGURADA", "ASEGURADA GENERAL"],
  ["ASEGURADA", "ASEGURADA PINES"],
  ["INSTALACIONES", "VINILO 0 A 1,499,999"],
  ["INSTALACIONES", "VINILO 1,500,000 EN ADELANTE"],
  ["INSTALACIONES", "RETIRO DE VINILO EXTERNO"],
  ["INSTALACIONES", "RETIRO DE VINILO INTEGRAL"],
  ...[
    "SEGURO PLATO", "TIRO DE ARRASTRE", "CONEXIÓN ELÉCTRICA DE TIRO DE ARRASTRE",
    "BARRAS EN TECHO", "ESTRIBOS", "INSTALACIÓN DE VIDRIO PARABRISAS",
    "MANTENIMIENTO ELEVAVIDRIOS", "INSONORIZACIÓN 1 CAPA", "INSTALACIÓN DE ALARMA PATROLINE",
    "INSTALACIÓN DE CARPA LONA", "INSTALACIÓN DE CARPA RETRÁCTIL",
    "INSTALACIÓN DE CARPA RETRÁCTIL ELÉCTRICA", "INSTALACIÓN PORTABICICLETA",
    "PAR DE LUCES", "BASE DE LUCES EXPLORADORAS", "MONTAJE Y AJUSTE DE VIDRIOS",
    "KEVLAR AUTO", "KEVLAR CAMIONETA", "KEVLAR BAÚL", "DESARME Y ARME",
    "INSTALACIÓN DE PLUMILLAS", "INSTALACIÓN DE PERNOS", "INSTALACIÓN DE HIDROFILMS",
    "INSTALACIÓN DE TAPETES", "INSTALACIÓN DE CARPLAY", "SEGURO TAPA RIN",
    "INSTALACIÓN DE CADENA SEGURO DE LLANTAS", "RETIRO CLEAR PLEX",
  ].map((nombre) => ["INSTALACIONES", nombre]),
  ...[
    "APLICACIÓN DE CERÁMICO EN PPF O VINILO SIN CORRECCIÓN",
    "CERÁMICO 1 AÑO", "CERÁMICO 3 AÑOS", "CERÁMICO 5 AÑOS",
    "RECUBRIMIENTO CERÁMICO AUTOBAHN", "RECUBRIMIENTO CERÁMICO AUTOBAHN INTEGRAL",
    "CERÁMICO INTERNO EN CUEROS", "CERÁMICO INTERNO EN CUEROS, ALCÁNTARA Y PLÁSTICOS",
    "CERÁMICO EN ALCÁNTARA", "CERÁMICO EN RINES", "CERÁMICO EN PLÁSTICOS INTERNOS",
    "CERÁMICO EN PLÁSTICOS EXTERNOS", "CERÁMICO EN PARTES NEGRAS", "MANTENIMIENTO CERÁMICO",
    "CERÁMICO PPF CON CORRECCIÓN O DESCONTAMINACIÓN", "MANTENIMIENTO CERÁMICO DE PPF CON PULIDO",
    "STRONG", "LAVADO PREMIUM + BOOST CERÁMICO",
    "DETAILING COMBO 1", "DETAILING COMBO 2", "DETAILING COMBO 3",
    "DETAILING COMBO 4", "DETAILING COMBO 5", "DETAILING COMBO 6",
    "LAVADO INTERNO PROFUNDO SIN DESMANTELAR", "LAVADO INTERNO PROFUNDO CON DESMANTELAMIENTO",
    "LAVADO DE MOTOR DETALLADO", "CORRECCIÓN DE PINTURA", "CORRECCIÓN PARA PPF",
    "APLICACIÓN DE 3 EN 1 GENERAL", "DESINFECCIÓN DE DUCTOS DE AIRE ACONDICIONADO",
    "MATIZADA COMPLETA", "DESINFECCIÓN VONIX INTERNA CON VAPOR", "MATIZADA POR PIEZA",
    "HIDRATACIÓN PROFUNDA DE CUEROS Y PLÁSTICOS", "DESMANCHADA DE FAROLAS X2",
    "DESMANCHADA DE VIDRIO PANORÁMICO", "DESMANCHADA DE VENTANAS", "DESMANCHADA DE LUNETA",
    "DESCONTAMINACIÓN Y DESMANCHADA COMPLETA", "DESMANCHADA DE VIDRIOS MÁS CERÁMICO",
    "PULIDO DE 13 PIEZAS", "DESMANCHADA MÁS CERÁMICO EN PANORÁMICO",
  ].map((nombre) => ["DETAILING", nombre]),
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
