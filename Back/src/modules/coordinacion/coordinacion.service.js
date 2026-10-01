import mongoose from "mongoose";
import { validarSinNovedadesBloqueantes } from "../asesores/asesoriaWorkflow.utils.js";

import Asesoria from "../asesores/asesoria.model.js";
import Corte from "../cortes/corte.model.js";
import User from "../users/user.model.js";
import {
  cerrarAlertaFlujo,
  crearAlertaInventarioCorte,
  crearAlertaMaterialListo,
  crearAlertaPropuestaCorte,
  crearAlertasInstaladores,
  crearAlertaServicioAsesor,
  crearAlertaServicioListoPago,
  crearAlertaInstalacionCompleta,
} from "../alertas/alerta.service.js";

const texto = (value) => String(value || "").trim();
const mayusculas = (value) => texto(value).toUpperCase();

const lineasOrden = (asesoria) => [
  ...(asesoria.polarizados || []).map((item, index) => ({
    linea: `POLARIZADO ${index + 1}`,
    material: `${item.material} ${item.porcentaje}`.trim(),
    partes: item.partes || [],
  })),
  ...(asesoria.ppf || []).map((item, index) => ({
    linea: `PPF ${index + 1}`,
    material: `PPF ${item.referencia}`.trim(),
    partes: item.aplicacion === "PIEZAS" ? item.piezas || [] : [item.aplicacion],
  })),
];

const agruparServiciosPpf = (items = []) => {
  const grupos = new Map();
  items.forEach((item) => {
    const referencia = mayusculas(item.referencia) || "PPF";
    const actual = grupos.get(referencia) || { servicio: `PPF ${referencia}`, descripcion: `PPF ${referencia}`, piezas: [] };
    actual.piezas.push(...(item.piezas?.length ? item.piezas : [item.aplicacion]).filter(Boolean));
    grupos.set(referencia, actual);
  });
  return [...grupos.values()].map((item) => ({ ...item, descripcion: `${item.descripcion} · ${[...new Set(item.piezas)].join(", ")}` }));
};

const serviciosOrden = (asesoria) => [
  ...(asesoria.polarizados || []).map((item, index) => ({ servicio: `POLARIZADO ${index + 1}`, descripcion: `${item.material} ${item.porcentaje}` })),
  ...agruparServiciosPpf(asesoria.ppf || []),
  ...(asesoria.serviciosAdicionales || []).map((item, index) => ({ servicio: `ADICIONAL ${index + 1}`, descripcion: `${item.tipo} ${item.detalle || ""}`.trim() })),
];

const obtenerOrden = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Orden no valida");
  const asesoria = await Asesoria.findById(id);
  if (!asesoria) throw new Error("Orden no encontrada");
  return asesoria;
};

export const listarOrdenesCoordinacion = async (user) => {
  const query = {};
  if (user.rol === "INSTALADOR") query["coordinacion.asignaciones.instaladorId"] = user._id;
  return Asesoria.find(query)
    .select("codigo cliente vehiculo polarizados ppf serviciosAdicionales garantia comercial coordinacion flujo novedades asesorNombre createdAt")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
};

export const listarInstaladores = async () =>
  User.find({ rol: "INSTALADOR", suspendido: { $ne: true } })
    .select("nombre correo")
    .sort({ nombre: 1 })
    .lean();

export const guardarPropuesta = async (id, data, user) => {
  const asesoria = await obtenerOrden(id);
  if (!["PENDIENTE_COORDINACION", "PENDIENTE_APROBACION_CORTE"].includes(asesoria.flujo.etapa) && asesoria.coordinacion?.estadoPropuesta !== "RECHAZADA") {
    throw new Error("La orden no esta disponible para preparar una propuesta");
  }

  const esperadas = lineasOrden(asesoria);
  const propuesta = (data.propuesta || []).map((item) => ({
    linea: mayusculas(item.linea),
    material: mayusculas(item.material),
    partes: (item.partes || []).map(mayusculas),
    anchoCm: Number(item.anchoCm || 0),
    largoCm: Number(item.largoCm || 0),
    cantidad: Math.max(Number(item.cantidad || 1), 1),
    metrosPropuestos: Number(item.metrosPropuestos || 0),
    observacion: mayusculas(item.observacion),
  }));
  const faltantes = esperadas.filter((linea) => !propuesta.some((item) => item.linea === linea.linea));
  if (faltantes.length) throw new Error(`Falta la propuesta de corte para: ${faltantes.map((item) => item.linea).join(", ")}`);
  if (propuesta.some((item) => !Number.isFinite(item.metrosPropuestos) || item.metrosPropuestos <= 0)) {
    throw new Error("Indique los metros que propone cortar para cada material");
  }

  const servicios = serviciosOrden(asesoria);
  const entradasAsignacion = data.asignaciones || [];
  const faltanAsignaciones = servicios.filter((item) => !entradasAsignacion.some((asignacion) => mayusculas(asignacion.servicio) === item.servicio));
  if (faltanAsignaciones.length) throw new Error(`Falta asignar instalador para: ${faltanAsignaciones.map((item) => item.descripcion).join(", ")}`);

  const ids = [...new Set(entradasAsignacion.map((item) => String(item.instaladorId || "")))];
  if (ids.some((item) => !mongoose.Types.ObjectId.isValid(item))) throw new Error("Seleccione instaladores validos");
  const instaladores = await User.find({ _id: { $in: ids }, rol: "INSTALADOR", suspendido: { $ne: true } }).lean();
  if (instaladores.length !== ids.length) throw new Error("Uno de los instaladores no esta disponible");
  const porId = new Map(instaladores.map((item) => [String(item._id), item]));

  asesoria.coordinacion.propuesta = propuesta;
  asesoria.coordinacion.asignaciones = entradasAsignacion.map((item) => ({
    servicio: mayusculas(item.servicio),
    descripcion: mayusculas(item.descripcion),
    instaladorId: item.instaladorId,
    instaladorNombre: mayusculas(porId.get(String(item.instaladorId))?.nombre),
    valorInstalacion: Math.max(Number(item.valorInstalacion || 0), 0),
    estado: "ESPERANDO_MATERIAL",
  }));
  asesoria.coordinacion.coordinadorId = user._id;
  asesoria.coordinacion.coordinadorNombre = mayusculas(user.nombre || user.rol);
  asesoria.coordinacion.estadoPropuesta = "EN_REVISION";
  asesoria.coordinacion.fechaPropuesta = new Date();
  asesoria.flujo.etapa = "PENDIENTE_APROBACION_CORTE";
  await asesoria.save();
  await crearAlertaPropuestaCorte(asesoria);
  await cerrarAlertaFlujo(`servicio-asesor:${asesoria._id}`);
  return asesoria;
};

export const revisarPropuesta = async (id, data, user) => {
  const asesoria = await obtenerOrden(id);
  if (asesoria.flujo.etapa !== "PENDIENTE_APROBACION_CORTE") throw new Error("La propuesta ya fue revisada");
  const decision = mayusculas(data.decision);
  if (!["APROBAR", "RECHAZAR"].includes(decision)) throw new Error("Seleccione una decision valida");
  if (decision === "RECHAZAR" && texto(data.observacion).length < 5) throw new Error("Indique el motivo del rechazo");
  asesoria.coordinacion.estadoPropuesta = decision === "APROBAR" ? "APROBADA" : "RECHAZADA";
  asesoria.coordinacion.observacionInventario = mayusculas(data.observacion);
  asesoria.coordinacion.revisadoPorNombre = mayusculas(user.nombre || user.rol);
  asesoria.coordinacion.fechaRevision = new Date();
  asesoria.flujo.etapa = decision === "APROBAR" ? "PENDIENTE_INVENTARIO" : "PENDIENTE_COORDINACION";
  asesoria.flujo.fechaEnvioInventario = decision === "APROBAR" ? new Date() : null;
  await asesoria.save();
  await cerrarAlertaFlujo(`propuesta-corte:${asesoria._id}`);
  if (decision === "APROBAR") await crearAlertaInventarioCorte(asesoria);
  else await crearAlertaServicioAsesor(asesoria);
  return asesoria;
};

export const marcarMaterialListo = async (id) => {
  const asesoria = await obtenerOrden(id);
  validarSinNovedadesBloqueantes(asesoria);
  if (!["PENDIENTE_INVENTARIO", "EN_PROCESO"].includes(asesoria.flujo.etapa)) throw new Error("La orden no esta disponible para finalizar cortes");
  const cortes = await Corte.find({ asesoriaId: asesoria._id }).select("asesoriaLinea").lean();
  const faltantes = lineasOrden(asesoria).filter((linea) => !cortes.some((corte) => corte.asesoriaLinea === linea.linea));
  if (faltantes.length) throw new Error(`Faltan cortes por registrar: ${faltantes.map((item) => item.linea).join(", ")}`);
  asesoria.flujo.etapa = "MATERIAL_LISTO";
  asesoria.coordinacion.estadoPropuesta = "MATERIAL_LISTO";
  asesoria.coordinacion.fechaMaterialListo = new Date();
  asesoria.coordinacion.asignaciones.forEach((item) => { item.estado = "PENDIENTE"; });
  await asesoria.save();
  await crearAlertaMaterialListo(asesoria);
  await crearAlertasInstaladores(asesoria);
  await cerrarAlertaFlujo(`corte-aprobado:${asesoria._id}`);
  return asesoria;
};

export const actualizarAsignacion = async (id, asignacionId, data, user) => {
  const asesoria = await obtenerOrden(id);
  validarSinNovedadesBloqueantes(asesoria);
  if (!["MATERIAL_LISTO", "EN_INSTALACION"].includes(asesoria.flujo.etapa)) {
    throw new Error("El material todavia no esta listo para iniciar la instalacion");
  }
  const asignacion = asesoria.coordinacion?.asignaciones?.id(asignacionId);
  if (!asignacion) throw new Error("Asignacion no encontrada");
  if (user.rol === "INSTALADOR" && String(asignacion.instaladorId) !== String(user._id)) throw new Error("Esta asignacion pertenece a otro instalador");
  const estado = mayusculas(data.estado);
  if (!["EN_PROCESO", "COMPLETADA"].includes(estado)) throw new Error("Estado de trabajo no valido");
  if (estado === "EN_PROCESO" && asignacion.estado !== "PENDIENTE") throw new Error("Este trabajo no esta pendiente de inicio");
  if (estado === "COMPLETADA" && asignacion.estado !== "EN_PROCESO") throw new Error("Debe iniciar el trabajo antes de completarlo");
  asignacion.estado = estado;
  asignacion.observacion = mayusculas(data.observacion);
  if (estado === "EN_PROCESO") asignacion.fechaInicio = asignacion.fechaInicio || new Date();
  if (estado === "COMPLETADA") asignacion.fechaFinalizacion = new Date();
  const todasCompletas = asesoria.coordinacion.asignaciones.every((item) => item.estado === "COMPLETADA");
  asesoria.flujo.etapa = "EN_INSTALACION";
  await asesoria.save();
  await cerrarAlertaFlujo(`asignacion:${asesoria._id}:${asignacion._id}`);
  if (todasCompletas) await crearAlertaInstalacionCompleta(asesoria);
  return asesoria;
};

export const enviarTrabajoAVentas = async (id) => {
  const asesoria = await obtenerOrden(id);
  validarSinNovedadesBloqueantes(asesoria);
  if (!["MATERIAL_LISTO", "EN_INSTALACION"].includes(asesoria.flujo.etapa)) throw new Error("El trabajo no esta listo para finalizar");
  if (!asesoria.coordinacion.asignaciones.length) throw new Error("La orden no tiene instalaciones asignadas");
  const pendientes = asesoria.coordinacion.asignaciones.filter((item) => item.estado !== "COMPLETADA");
  if (pendientes.length) {
    const detalle = pendientes.map((item) => `${item.descripcion || item.servicio} (${item.instaladorNombre || "SIN INSTALADOR"})`).join(", ");
    throw new Error(`Faltan instalaciones por completar: ${detalle}`);
  }
  const garantiaSinCobro = asesoria.garantia?.esGarantia && Number(asesoria.comercial?.totalAcordado || 0) <= 0;
  asesoria.flujo.etapa = garantiaSinCobro ? "FINALIZADA" : "PENDIENTE_PAGO";
  asesoria.flujo.fechaEnvioVentas = garantiaSinCobro ? null : new Date();
  asesoria.flujo.fechaFinalizacion = garantiaSinCobro ? new Date() : null;
  if (garantiaSinCobro) asesoria.garantia.estado = "FINALIZADA";
  await asesoria.save();
  if (!garantiaSinCobro) await crearAlertaServicioListoPago(asesoria);
  await cerrarAlertaFlujo(`material-listo:${asesoria._id}`);
  await cerrarAlertaFlujo(`instalacion-completa:${asesoria._id}`);
  return asesoria;
};
