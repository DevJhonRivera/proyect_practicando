import mongoose from "mongoose";
import { validarSinNovedadesBloqueantes } from "../asesores/asesoriaWorkflow.utils.js";

import Asesoria from "../asesores/asesoria.model.js";
import Corte from "../cortes/corte.model.js";
import User from "../users/user.model.js";
import MedidaVehiculo from "../medidasVehiculos/medidaVehiculo.model.js";
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

const claveMedidaPorPieza = {
  DELANTERAS: "delanteras",
  TRASERAS: "traseras",
  PANORAMICO: "panoramico",
  "PANORÁMICO": "panoramico",
  LUNETA: "luneta",
  FIJOS: "fijos",
  CUSTODIAS: "custodias",
  SUNROOF: "sunroof",
  "SUN ROOF": "sunroof",
};

const guardarMedidasEnCatalogo = async (asesoria, propuesta) => {
  const marca = mayusculas(asesoria.vehiculo?.marca);
  const modelo = mayusculas(asesoria.vehiculo?.modelo);
  const anio = String(asesoria.vehiculo?.anio || "").replace(/\D/g, "").slice(0, 4);
  if (!marca || !modelo) return;

  const medidas = new Map();
  propuesta.flatMap((item) => item.medidasPiezas || []).forEach((medida) => {
    const clave = claveMedidaPorPieza[mayusculas(medida.pieza)];
    const anchoCm = Number(medida.anchoCm || 0);
    const largoCm = Number(medida.largoCm || 0);
    if (clave && anchoCm > 0 && largoCm > 0) {
      medidas.set(clave, { anchoCm, largoCm, cantidad: Math.max(Number(medida.cantidad || 1), 1) });
    }
  });
  if (!medidas.size) return;

  const cambios = {};
  medidas.forEach((dimension, clave) => { cambios[`medidas.${clave}`] = dimension; });
  await MedidaVehiculo.findOneAndUpdate(
    { marca, modelo, anio },
    { $set: cambios, $setOnInsert: { marca, modelo, anio } },
    { upsert: true, new: true, runValidators: true },
  );
};

const expandirPartesMedibles = (partes = []) => [...new Set(partes.flatMap((parte) =>
  mayusculas(parte) === "U" ? ["DELANTERAS", "TRASERAS", "LUNETA", "FIJOS", "CUSTODIAS"] : [mayusculas(parte)]
))];

const lineasOrden = (asesoria) => [
  ...(asesoria.polarizados || []).map((item, index) => ({
    linea: `POLARIZADO ${index + 1}`,
    material: `${item.material} ${item.porcentaje}`.trim(),
    partes: expandirPartesMedibles(item.partes || []),
  })),
  ...(asesoria.ppf || []).map((item, index) => ({
    linea: `PPF ${index + 1}`,
    material: `PPF ${item.referencia}`.trim(),
    partes: item.piezas?.length ? item.piezas : [item.aplicacion].filter(Boolean),
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
  return [...grupos.values()].map((item) => {
    const partes = [...new Set(item.piezas)].map(mayusculas);
    return { ...item, partes, descripcion: `${item.descripcion} · ${partes.join(", ")}` };
  });
};

const serviciosOrden = (asesoria) => [
  ...(asesoria.polarizados || []).map((item, index) => ({ servicio: `POLARIZADO ${index + 1}`, descripcion: `${item.material} ${item.porcentaje}`, partes: expandirPartesMedibles(item.partes || []) })),
  ...agruparServiciosPpf(asesoria.ppf || []),
  ...(asesoria.serviciosAdicionales || []).map((item, index) => ({ servicio: `ADICIONAL ${index + 1}`, descripcion: `${item.tipo} ${item.detalle || ""}`.trim(), partes: [item.detalle || item.tipo].filter(Boolean).map(mayusculas) })),
];

const obtenerOrden = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Orden no valida");
  const asesoria = await Asesoria.findById(id);
  if (!asesoria) throw new Error("Orden no encontrada");
  return asesoria;
};

export const listarOrdenesCoordinacion = async (user) => {
  const query = {};
  const nombresCompatibles = [...new Set([
    mayusculas(user.nombre),
    ...mayusculas(user.nombre).split(/\s+/).filter((item) => item.length >= 3),
  ].filter(Boolean))];
  if (user.rol === "INSTALADOR") query.$or = [
    { "coordinacion.asignaciones.instaladorId": user._id },
    { "garantia.instaladorId": user._id },
    { "garantia.tipo": "GARANTIA_INSTALADOR", "garantia.instalador": { $in: nombresCompatibles } },
    { "novedades.instaladorId": user._id },
  ];
  // Coordinacion e Inventario trabajan sobre la bandeja activa. El historial
  // completo se consulta paginado desde Ordenes de trabajo.
  if (user.rol !== "INSTALADOR") {
    query["flujo.etapa"] = { $nin: ["FINALIZADA", "CANCELADA"] };
  }
  const ordenes = await Asesoria.find(query)
    .select("codigo cliente vehiculo polarizados ppf serviciosAdicionales garantia comercial coordinacion flujo novedades asesorNombre createdAt")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const garantiasIds = ordenes.filter((orden) => orden.garantia?.esGarantia).map((orden) => orden._id);
  const costos = garantiasIds.length ? await Corte.aggregate([
    { $match: { asesoriaId: { $in: garantiasIds } } },
    { $group: { _id: "$asesoriaId", total: { $sum: { $ifNull: ["$costoMaterialCop", 0] } } } },
  ]) : [];
  const costoPorOrden = new Map(costos.map((item) => [String(item._id), Number(item.total || 0)]));
  const resultado = ordenes.map((orden) => ({
    ...orden,
    garantia: { ...orden.garantia, costoMaterial: costoPorOrden.get(String(orden._id)) || 0 },
  }));

  if (user.rol !== "INSTALADOR") return resultado;

  const ocultarValor = (item) => {
    const seguro = { ...item };
    delete seguro.valor;
    return seguro;
  };

  return resultado.map((orden) => ({
    ...orden,
    comercial: undefined,
    coordinacion: {
      ...orden.coordinacion,
      asignaciones: (orden.coordinacion?.asignaciones || []).filter(
        (item) => String(item.instaladorId || "") === String(user._id)
      ),
    },
    polarizados: (orden.polarizados || []).map(ocultarValor),
    ppf: (orden.ppf || []).map(ocultarValor),
    serviciosAdicionales: (orden.serviciosAdicionales || []).map(ocultarValor),
  }));
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
  const propuesta = (data.propuesta || []).map((item) => {
    const partes = (item.partes || []).map(mayusculas);
    const medidasPiezas = (item.medidasPiezas || []).map((medida) => ({
      pieza: mayusculas(medida.pieza),
      anchoCm: Number(medida.anchoCm || 0),
      largoCm: Number(medida.largoCm || 0),
      cantidad: Math.max(Number(medida.cantidad || 1), 1),
    })).filter((medida) => medida.pieza && partes.includes(medida.pieza));
    return {
      linea: mayusculas(item.linea),
      material: mayusculas(item.material),
      partes,
      anchoCm: Number(item.anchoCm || 0),
      largoCm: Number(item.largoCm || 0),
      cantidad: Math.max(Number(item.cantidad || 1), 1),
      medidasPiezas,
      metrosPropuestos: Number(item.metrosPropuestos || 0),
      observacion: mayusculas(item.observacion),
    };
  });
  const faltantes = esperadas.filter((linea) => !propuesta.some((item) => item.linea === linea.linea));
  if (faltantes.length) throw new Error(`Falta la propuesta de corte para: ${faltantes.map((item) => item.linea).join(", ")}`);
  if (propuesta.some((item) => !Number.isFinite(item.metrosPropuestos) || item.metrosPropuestos <= 0)) {
    throw new Error("Indique los metros que propone cortar para cada material");
  }
  if (propuesta.some((item) => item.medidasPiezas.some((medida) =>
    (medida.anchoCm > 0 && medida.largoCm <= 0) || (medida.largoCm > 0 && medida.anchoCm <= 0)
  ))) {
    throw new Error("Complete ancho y largo para cada pieza medida");
  }
  if (propuesta.some((item) => item.medidasPiezas.some((medida) =>
    !Number.isFinite(medida.anchoCm) || medida.anchoCm < 0 ||
    !Number.isFinite(medida.largoCm) || medida.largoCm < 0 ||
    !Number.isInteger(medida.cantidad) || medida.cantidad < 1
  ))) {
    throw new Error("Revise las medidas y cantidades de cada parte del vehículo");
  }

  const servicios = serviciosOrden(asesoria);
  const entradasAsignacion = data.asignaciones || [];
  if (!entradasAsignacion.length) throw new Error("Agregue al menos una asignacion de instalacion");
  const serviciosValidos = new Set(servicios.map((item) => item.servicio));
  const asignacionesDesconocidas = entradasAsignacion.filter((item) => !serviciosValidos.has(mayusculas(item.servicio)));
  if (asignacionesDesconocidas.length) throw new Error("Hay asignaciones que no pertenecen a los servicios de esta orden");
  const faltanAsignaciones = servicios.filter((item) => !entradasAsignacion.some((asignacion) => mayusculas(asignacion.servicio) === item.servicio));
  if (faltanAsignaciones.length) throw new Error(`Falta asignar instalador para: ${faltanAsignaciones.map((item) => item.descripcion).join(", ")}`);
  if (entradasAsignacion.some((item) => !texto(item.descripcion))) throw new Error("Indique que parte del trabajo realizara cada instalador");
  for (const servicio of servicios) {
    const partesEsperadas = new Set((servicio.partes || []).map(mayusculas));
    if (!partesEsperadas.size) continue;
    const partesAsignadas = entradasAsignacion
      .filter((item) => mayusculas(item.servicio) === servicio.servicio)
      .flatMap((item) => mayusculas(item.descripcion).split(/\s*(?:\||,)\s*/).filter(Boolean));
    const desconocidas = partesAsignadas.filter((parte) => !partesEsperadas.has(parte));
    if (desconocidas.length) throw new Error(`Hay partes no validas en ${servicio.descripcion}`);
    const duplicadas = partesAsignadas.filter((parte, index) => partesAsignadas.indexOf(parte) !== index);
    if (duplicadas.length) throw new Error(`Una parte no puede asignarse a dos instaladores en ${servicio.descripcion}`);
    const faltantesPartes = [...partesEsperadas].filter((parte) => !partesAsignadas.includes(parte));
    if (faltantesPartes.length) throw new Error(`Falta asignar: ${faltantesPartes.join(", ")}`);
  }

  const ids = [...new Set(entradasAsignacion.map((item) => String(item.instaladorId || "")))];
  if (ids.some((item) => !mongoose.Types.ObjectId.isValid(item))) throw new Error("Seleccione instaladores validos");
  const instaladores = await User.find({ _id: { $in: ids }, rol: "INSTALADOR", suspendido: { $ne: true } }).lean();
  if (instaladores.length !== ids.length) throw new Error("Uno de los instaladores no esta disponible");
  const porId = new Map(instaladores.map((item) => [String(item._id), item]));
  const garantiaInstalador = asesoria.garantia?.esGarantia && (
    asesoria.garantia?.tipo === "GARANTIA_INSTALADOR" || asesoria.garantia?.responsable === "INSTALADOR"
  );
  const instaladorResponsableId = String(asesoria.garantia?.instaladorId || "");
  const asignacionesSinPago = entradasAsignacion.filter((item) => {
    const esResponsableGarantia = garantiaInstalador && instaladorResponsableId && String(item.instaladorId) === instaladorResponsableId;
    return !esResponsableGarantia && Number(item.valorInstalacion || 0) <= 0;
  });
  if (asignacionesSinPago.length) {
    throw new Error("Ingrese el precio de instalación para cada instalador. Solo el responsable de una garantía puede quedar sin pago");
  }

  asesoria.coordinacion.propuesta = propuesta;
  asesoria.coordinacion.asignaciones = entradasAsignacion.map((item) => ({
    servicio: mayusculas(item.servicio),
    descripcion: mayusculas(item.descripcion),
    instaladorId: item.instaladorId,
    instaladorNombre: mayusculas(porId.get(String(item.instaladorId))?.nombre),
    valorInstalacion: garantiaInstalador && String(item.instaladorId) === instaladorResponsableId && !texto(item.valorInstalacion)
      ? 0
      : Math.max(Number(item.valorInstalacion || 0), 0),
    estado: "ESPERANDO_MATERIAL",
  }));
  asesoria.coordinacion.coordinadorId = user._id;
  asesoria.coordinacion.coordinadorNombre = mayusculas(user.nombre || user.rol);
  asesoria.coordinacion.estadoPropuesta = "EN_REVISION";
  asesoria.coordinacion.fechaPropuesta = new Date();
  asesoria.flujo.etapa = "PENDIENTE_APROBACION_CORTE";
  await asesoria.save();
  await guardarMedidasEnCatalogo(asesoria, propuesta).catch((error) => {
    console.error("No fue posible actualizar el catalogo de medidas del vehiculo", error);
  });
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
  asesoria.auditoria.push({
    accion: estado === "COMPLETADA" ? "INSTALACION_COMPLETADA" : "INSTALACION_INICIADA",
    descripcion: `${asignacion.servicio} · ${asignacion.descripcion} · ${asignacion.instaladorNombre}`,
    usuarioId: user._id,
    usuarioNombre: mayusculas(user.nombre || user.rol),
    fecha: new Date(),
  });
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
  const accesoriosPendientes = (asesoria.accesorios || []).filter((item) => Number(item.cantidadPendiente || 0) > 0);
  if (accesoriosPendientes.length) {
    const detalle = accesoriosPendientes.map((item) => `${item.nombre}: faltan ${item.cantidadPendiente}`).join(", ");
    throw new Error(`No se puede enviar a Ventas. Faltan accesorios por recibir: ${detalle}`);
  }
  if (!["MATERIAL_LISTO", "EN_INSTALACION"].includes(asesoria.flujo.etapa)) throw new Error("El trabajo no esta listo para finalizar");
  if (!asesoria.coordinacion.asignaciones.length) throw new Error("La orden no tiene instalaciones asignadas");
  const pendientes = asesoria.coordinacion.asignaciones.filter((item) => item.estado !== "COMPLETADA");
  if (pendientes.length) {
    const detalle = pendientes.map((item) => `${item.descripcion || item.servicio} (${item.instaladorNombre || "SIN INSTALADOR"})`).join(", ");
    throw new Error(`Faltan instalaciones por completar: ${detalle}`);
  }
  const garantiaSinCobro = asesoria.garantia?.esGarantia && Number(asesoria.comercial?.totalAcordado || 0) <= 0;
  if (asesoria.garantia?.esGarantia) {
    const cortesGarantia = await Corte.find({ asesoriaId: asesoria._id }).select("costoMaterialCop").lean();
    asesoria.garantia.costoMaterial = cortesGarantia.reduce(
      (total, corte) => total + Number(corte.costoMaterialCop || 0), 0
    );
  }
  asesoria.flujo.etapa = garantiaSinCobro ? "FINALIZADA" : "PENDIENTE_PAGO";
  asesoria.flujo.fechaEnvioVentas = garantiaSinCobro ? null : new Date();
  asesoria.flujo.fechaFinalizacion = garantiaSinCobro ? new Date() : null;
  if (garantiaSinCobro) asesoria.garantia.estado = "FINALIZADA";
  if (garantiaSinCobro) asesoria.pago.estado = "NO_APLICA";
  await asesoria.save();
  if (!garantiaSinCobro) await crearAlertaServicioListoPago(asesoria);
  await cerrarAlertaFlujo(`material-listo:${asesoria._id}`);
  await cerrarAlertaFlujo(`instalacion-completa:${asesoria._id}`);
  return asesoria;
};
