import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import ListaPreciosVenta from "./precioVenta.model.js";

const iniciales = JSON.parse(readFileSync(new URL("./preciosIniciales.json", import.meta.url), "utf8"));

export async function asegurarListaPrecios() {
  await ListaPreciosVenta.updateOne({ _id: "vigente" }, {
    $setOnInsert: { filas: iniciales },
  }, { upsert: true });
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
  return { hoja, grupo, descripcion, modalidad: data.modalidad, precios,
    condiciones: data.condiciones.map((valor) => valor.trim()), notas: data.notas.trim(),
    activo: data.activo, requiereRevision: data.requiereRevision };
}

export async function listarPreciosVenta(administrador) {
  await asegurarListaPrecios();
  const lista = await ListaPreciosVenta.findById("vigente").lean();
  return administrador ? lista.filas : lista.filas.filter((fila) => fila.activo && !fila.requiereRevision);
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
