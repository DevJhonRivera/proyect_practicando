import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import ListaPreciosVenta from "./precioVenta.model.js";
import { materialesDeTarifa, normalizarMaterial } from "./materialTarifa.utils.js";

const iniciales = JSON.parse(readFileSync(new URL("./preciosIniciales.json", import.meta.url), "utf8"));
const piezasIniciales = JSON.parse(readFileSync(new URL("./piezasPpfIniciales.json", import.meta.url), "utf8"));

const tarifasPpfRetiradas = JSON.parse(readFileSync(new URL("./tarifasPpfRetiradas.json", import.meta.url), "utf8"));

export async function asegurarListaPrecios() {
  await ListaPreciosVenta.updateOne({ _id: "vigente" }, {
    $setOnInsert: { filas: iniciales },
  }, { upsert: true });
  await ListaPreciosVenta.updateOne({ _id: "vigente", tarifasPpfRetiradasVersion: { $ne: 1 } }, {
    $pull: { filas: { codigo: { $in: tarifasPpfRetiradas } } },
    $set: { tarifasPpfRetiradasVersion: 1 },
  });
  // Una sola carga: los precios editados o eliminados nunca se reponen al consultar.
  await ListaPreciosVenta.updateOne({ _id: "vigente", piezasPpfVersion: { $ne: 1 } }, {
    $push: { filas: { $each: piezasIniciales } }, $set: { piezasPpfVersion: 1 },
  });
}

function texto(valor, maximo, nombre) {
  if (typeof valor !== "string" || !valor.trim() || valor.length > maximo) {
    throw new Error(`Revise ${nombre}.`);
  }
  return valor.trim();
}

export function prepararPrecioVenta(data) {
  const hoja = texto(data.hoja, 100, "la categoría");
  const grupo = texto(data.grupo, 500, "el grupo");
  const descripcion = texto(data.descripcion, 500, "la descripción");
  if (!["FIJO", "PORCENTAJE"].includes(data.modalidad)) throw new Error("Seleccione el tipo de precio.");
  if (!Array.isArray(data.precios) || !data.precios.length || data.precios.length > 4) throw new Error("Ingrese de uno a cuatro niveles de precio.");
  const precios = data.precios.map((valor) => {
    if (valor === null || valor === "") return null;
    if (!["number", "string"].includes(typeof valor) || String(valor).trim() === "") throw new Error("Precio no válido.");
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0 || numero > Number.MAX_SAFE_INTEGER ||
        (data.modalidad === "FIJO" && !Number.isSafeInteger(numero)) ||
        (data.modalidad === "PORCENTAJE" && numero > 100)) {
      throw new Error("Use pesos enteros positivos o porcentajes entre 0 y 100.");
    }
    return numero;
  });
  if (typeof data.activo !== "boolean" || typeof data.requiereRevision !== "boolean") throw new Error("Estado no válido.");
  if (!data.requiereRevision && !precios.some((valor) => valor !== null)) throw new Error("Ingrese al menos un precio o marque pendiente de revisión.");
  if (!Array.isArray(data.condiciones) || data.condiciones.length !== precios.length ||
      data.condiciones.some((valor) => typeof valor !== "string" || valor.length > 600)) throw new Error("Revise las condiciones de cada nivel.");
  if (typeof data.notas !== "string" || data.notas.length > 4000) throw new Error("Las notas admiten hasta 4000 caracteres.");
  const materiales = data.materiales || [];
  if (!Array.isArray(materiales) || materiales.length > 40 || materiales.some((valor) => typeof valor !== "string" || valor.length > 140)) {
    throw new Error("Revise los materiales asociados a la tarifa.");
  }
  return { hoja, grupo, descripcion, modalidad: data.modalidad, precios,
    ...(data.materiales !== undefined ? { materiales: [...new Set(materiales.map(normalizarMaterial).filter(Boolean))] } : {}),
    condiciones: data.condiciones.map((valor) => valor.trim()), notas: data.notas.trim(),
    activo: data.activo, requiereRevision: data.requiereRevision };
}

export async function listarPreciosVenta(administrador, incluirPendientes = false) {
  await asegurarListaPrecios();
  const lista = await ListaPreciosVenta.findById("vigente").lean();
  const filas = lista.filas.map((fila) => ({ ...fila, materiales: materialesDeTarifa(fila) }));
  return administrador ? filas : filas.filter((fila) => fila.activo && (incluirPendientes || !fila.requiereRevision));
}

export async function guardarPrecioVenta(codigo, data, user) {
  const fila = prepararPrecioVenta(data);
  if (!Number.isSafeInteger(data.revision) || data.revision < 0) throw new Error("Versión de precio no válida.");
  await asegurarListaPrecios();
  const cambios = Object.fromEntries(Object.entries({ ...fila,
    actualizadoPor: user.nombre || user.rol, fechaActualizacion: new Date(),
  }).map(([clave, valor]) => [`filas.$.${clave}`, valor]));
  const lista = await ListaPreciosVenta.findOneAndUpdate({ _id: "vigente",
    filas: { $elemMatch: { codigo, revision: data.revision } },
  }, { $set: cambios, $inc: { "filas.$.revision": 1 } }, {
    new: true, runValidators: true, projection: { filas: { $elemMatch: { codigo } } },
  }).lean();
  if (!lista) {
    const error = new Error("Este precio cambió en otra sesión. Recarga la lista antes de editarlo.");
    error.status = 409;
    throw error;
  }
  return lista.filas[0];
}

export async function crearPrecioVenta(data, user) {
  const fila = { ...prepararPrecioVenta(data), codigo: randomUUID(), revision: 0,
    actualizadoPor: user.nombre || user.rol, fechaActualizacion: new Date() };
  await asegurarListaPrecios();
  await ListaPreciosVenta.updateOne({ _id: "vigente" }, { $push: { filas: fila } }, { runValidators: true });
  return fila;
}

export async function eliminarPrecioVenta(codigo, revision) {
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Versión de precio no válida.");
  const resultado = await ListaPreciosVenta.updateOne({ _id: "vigente",
    filas: { $elemMatch: { codigo, revision } },
  }, { $pull: { filas: { codigo, revision } } });
  if (!resultado.modifiedCount) {
    const error = new Error("El precio cambió o ya fue eliminado. Actualiza la lista antes de continuar.");
    error.status = 409;
    throw error;
  }
}
