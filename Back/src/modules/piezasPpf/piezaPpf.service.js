import PiezaPpf from "./piezaPpf.model.js";

const normalizarTexto = (value) =>
  String(value || "").trim();

const mayusculas = (value) =>
  normalizarTexto(value).toUpperCase();

const soloNumeros = (value) =>
  normalizarTexto(value).replace(/\D/g, "");

const escapeRegex = (value) =>
  normalizarTexto(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const regexExacto = (value) =>
  new RegExp(`^${escapeRegex(value)}$`, "i");

const prepararData = (data = {}) => {
  const marca = mayusculas(data.marca);
  const modelo = mayusculas(data.modelo);
  const anio = soloNumeros(data.anio).slice(0, 4);
  const ubicacion = mayusculas(data.ubicacion);
  const pieza = mayusculas(data.pieza);

  if (!marca) {
    throw new Error("Ingrese la marca del carro");
  }

  if (!modelo) {
    throw new Error("Ingrese el modelo del carro");
  }

  if (!["EXTERIOR", "INTERIOR"].includes(ubicacion)) {
    throw new Error("Seleccione si la pieza es exterior o interior");
  }

  if (!pieza) {
    throw new Error("Ingrese la pieza del carro");
  }

  if (anio && anio.length !== 4) {
    throw new Error("El año debe tener 4 numeros");
  }

  const anchoCm = Number(data.anchoCm || 0);
  const largoCm = Number(data.largoCm || 0);
  const cantidad = Number(data.cantidad || 1);
  if (![anchoCm, largoCm, cantidad].every(Number.isFinite) || anchoCm < 0 || largoCm < 0 || cantidad < 1) {
    throw new Error("Revise las medidas y la cantidad de la pieza");
  }

  return {
    marca,
    modelo,
    anio,
    ubicacion,
    pieza,
    anchoCm,
    largoCm,
    cantidad: Math.max(1, Math.floor(cantidad)),
    observaciones:
      normalizarTexto(data.observaciones),
    activa:
      data.activa !== false,
  };
};

const validarDuplicado = async (data, idIgnorado) => {
  const filtro = {
    marca:
      regexExacto(data.marca),
    modelo:
      data.modelo,
    anio:
      data.anio || "",
    ubicacion:
      data.ubicacion,
    pieza:
      regexExacto(data.pieza),
    activa:
      {
        $ne: false,
      },
  };

  if (idIgnorado) {
    filtro._id = {
      $ne: idIgnorado,
    };
  }

  const existe =
    await PiezaPpf.findOne(filtro);

  if (existe) {
    throw new Error(
      "Esta pieza ya existe para esa marca, modelo y ubicacion"
    );
  }
};

export const crearPiezaPpf = async (data) => {
  const preparada = prepararData(data);

  await validarDuplicado(preparada);

  return await PiezaPpf.create(preparada);
};

export const listarPiezasPpf = async (query = {}) => {
  const filtro = {
    activa: {
      $ne: false,
    },
  };

  if (query.marca) {
    filtro.marca = regexExacto(query.marca);
  }

  const condiciones = [];
  if (query.modelo) {
    const modelo = mayusculas(query.modelo);
    const anio = soloNumeros(query.anio).slice(0, 4);
    // Los registros antiguos guardaban el año dentro de `modelo`.
    condiciones.push({ $or: [
      { modelo: regexExacto(modelo), ...(anio ? { anio: { $in: [anio, "", null] } } : {}) },
      ...(anio ? [{ modelo: anio, anio: { $in: ["", null] } }] : []),
    ] });
  } else if (query.anio) {
    const anio = soloNumeros(query.anio).slice(0, 4);
    condiciones.push({ $or: [{ anio }, { modelo: anio, anio: { $in: ["", null] } }] });
  }

  if (
    ["EXTERIOR", "INTERIOR"].includes(
      mayusculas(query.ubicacion)
    )
  ) {
    filtro.ubicacion = mayusculas(query.ubicacion);
  }

  if (query.search) {
    const texto = escapeRegex(query.search);
    condiciones.push({ $or: [
      {
        marca: {
          $regex: texto,
          $options: "i",
        },
      },
      {
        modelo: {
          $regex: texto,
          $options: "i",
        },
      },
      {
        pieza: {
          $regex: texto,
          $options: "i",
        },
      },
      {
        observaciones: {
          $regex: texto,
          $options: "i",
        },
      },
    ] });
  }

  if (condiciones.length) filtro.$and = condiciones;

  return await PiezaPpf.find(filtro).sort({
    marca: 1,
    modelo: -1,
    anio: -1,
    ubicacion: 1,
    pieza: 1,
  });
};

export const actualizarPiezaPpf = async (id, data) => {
  const preparada = prepararData(data);

  await validarDuplicado(preparada, id);

  const pieza =
    await PiezaPpf.findByIdAndUpdate(
      id,
      preparada,
      {
        new: true,
        runValidators: true,
      }
    );

  if (!pieza) {
    throw new Error("Pieza no encontrada");
  }

  return pieza;
};

export const eliminarPiezaPpf = async (id) => {
  const pieza =
    await PiezaPpf.findByIdAndUpdate(
      id,
      {
        activa: false,
      },
      {
        new: true,
      }
    );

  if (!pieza) {
    throw new Error("Pieza no encontrada");
  }

  return pieza;
};
