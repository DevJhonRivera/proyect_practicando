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
  const modelo = soloNumeros(data.modelo);
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

  return {
    marca,
    modelo,
    ubicacion,
    pieza,
    anchoCm:
      Number(data.anchoCm || 0),
    largoCm:
      Number(data.largoCm || 0),
    cantidad:
      Math.max(1, Number(data.cantidad || 1)),
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

  if (query.modelo) {
    filtro.modelo = soloNumeros(query.modelo);
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
    filtro.$or = [
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
    ];
  }

  return await PiezaPpf.find(filtro).sort({
    marca: 1,
    modelo: -1,
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
