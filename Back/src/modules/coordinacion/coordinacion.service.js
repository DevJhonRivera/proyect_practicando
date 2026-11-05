import { validarFirmasTrabajo } from "../asesores/autorizaciones.utils.js";
import { ultimaRevision, validarRevisionCalidad } from "./calidad.utils.js";
import { avisarVehiculoListo } from "./notificacionCalidad.service.js";
import mongoose from "mongoose";
import { calcularManoObra, obtenerTarifasManoObra } from "./manoObra.js";
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
  crearAlertaSolicitudNovedad,
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
  validarFirmasTrabajo(asesoria);
  return asesoria;
};

export const listarOrdenesCoordinacion = async (user, { desde, hasta } = {}) => {
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
  const campos = "codigo cliente vehiculo polarizados ppf serviciosAdicionales garantia comercial coordinacion flujo novedades asesorNombre createdAt accesorios.nombre accesorios.marca accesorios.cantidadPendiente";
  const ordenes = await Asesoria.find(query)
    .select(campos)
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  if (["VENTAS", "ADMIN", "SUPERUSUARIO"].includes(user.rol) && (desde || hasta)) {
    const rango = {};
    for (const [dia, operador, hora] of [[desde, "$gte", "00:00:00.000"], [hasta, "$lte", "23:59:59.999"]]) {
      if (!dia) continue;
      const fecha = new Date(`${dia}T${hora}-05:00`);
      if (typeof dia !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dia) || !Number.isFinite(fecha.getTime())) {
        throw new Error("Fecha de liquidación no válida");
      }
      rango[operador] = fecha;
    }
    const historial = await Asesoria.find({
      _id: { $nin: ordenes.map((orden) => orden._id) },
      "flujo.etapa": { $ne: "CANCELADA" },
      $or: [
        { "coordinacion.asignaciones": { $elemMatch: { estado: "COMPLETADA", $or: [{ fechaFinalizacion: rango }, { fechaFinalizacion: null, fechaInicio: rango }] } } },
        { "flujo.fechaFinalizacion": rango },
        { "novedades.fechaResolucion": rango },
        { "novedades.fecha": rango },
        { createdAt: rango, "coordinacion.asignaciones.estado": "COMPLETADA" },
      ],
    }).select(campos).lean();
    ordenes.push(...historial);
  }
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
  const tarifas = entradasAsignacion.some((item) => item.calcularManoObra === true) ? await obtenerTarifasManoObra() : {};
  const calculos = new Map();
  for (const servicio of servicios) {
    const filas = entradasAsignacion.filter((item) => mayusculas(item.servicio) === servicio.servicio);
    const valores = calcularManoObra(asesoria, servicio, filas, tarifas);
    if (valores) filas.forEach((fila, index) => calculos.set(fila, valores[index]));
  }
  const asignacionesSinPago = entradasAsignacion.filter((item) => {
    if (calculos.has(item)) return false;
    const esResponsableGarantia = garantiaInstalador && instaladorResponsableId && String(item.instaladorId) === instaladorResponsableId;
    return !esResponsableGarantia && Number(item.valorInstalacion || 0) <= 0;
  });
  if (asignacionesSinPago.length) {
    throw new Error("Ingrese el precio de instalación para cada instalador. Solo el responsable de una garantía puede quedar sin pago");
  }

  asesoria.coordinacion.propuesta = propuesta;
  asesoria.coordinacion.calidad.requerida = true;
  asesoria.coordinacion.calidad.estado = "SIN_REVISAR";
  asesoria.coordinacion.asignaciones = entradasAsignacion.map((item) => ({
    servicio: mayusculas(item.servicio),
    descripcion: mayusculas(item.descripcion),
    instaladorId: item.instaladorId,
    instaladorNombre: mayusculas(porId.get(String(item.instaladorId))?.nombre),
    valorInstalacion: garantiaInstalador && String(item.instaladorId) === instaladorResponsableId && !texto(item.valorInstalacion)
      ? 0
      : Math.max(Number(item.valorInstalacion || 0), 0),
    estado: "ESPERANDO_MATERIAL",
    ...calculos.get(item),
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

export const marcarMaterialListo = async (id, user) => {
  const asesoria = await obtenerOrden(id);
  validarSinNovedadesBloqueantes(asesoria);
  if (asesoria.flujo.etapa === "REPROCESO") {
    if (!["COORDINADOR", "ADMIN", "SUPERUSUARIO"].includes(user?.rol)) throw new Error("Coordinacion debe confirmar la recepcion del material de reproceso");
    const revision = ultimaRevision(asesoria);
    const novedad = asesoria.novedades.id(revision?.novedadId);
    if (revision?.decision !== "RECORTE" || !novedad || novedad.estado !== "RESUELTA" || revision.materialRecibidoEn) throw new Error("El recorte debe aprobarse y completarse antes de confirmar su recepcion");
    const cortesNuevos = await Corte.find({ asesoriaId: asesoria._id, novedadId: novedad._id }).select("asesoriaLineaOrigen").lean();
    if (!novedad.serviciosAfectados.length || novedad.serviciosAfectados.some((l) => !cortesNuevos.some((c) => c.asesoriaLineaOrigen === l))) throw new Error("Faltan cortes nuevos de la reposicion");
    revision.materialRecibidoEn = new Date();
    revision.materialRecibidoPor = user.nombre || user.rol;
    for (const ref of revision.asignaciones) {
      const asignacion = asesoria.coordinacion.asignaciones.id(ref.asignacionId);
      if (!asignacion || asignacion.estado !== "ESPERANDO_MATERIAL") throw new Error("La instalacion no esta esperando el nuevo material");
      asignacion.estado = "PENDIENTE";
    }
    asesoria.auditoria.push({ accion: "RECEPCION_MATERIAL_REPROCESO", descripcion: `Recibido material del recorte ${novedad._id}`, usuarioId: user._id, usuarioNombre: user.nombre || user.rol, fecha: new Date() });
    await asesoria.save();
    await crearAlertasInstaladores({ ...asesoria.toObject(), coordinacion: { asignaciones: asesoria.coordinacion.asignaciones.filter((a) => a.estado === "PENDIENTE") } });
    await cerrarAlertaFlujo(`repeticion-lista:${asesoria._id}:${novedad._id}`);
    return asesoria;
  }
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
  if (!["MATERIAL_LISTO", "EN_INSTALACION", "REPROCESO"].includes(asesoria.flujo.etapa)) {
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
  asesoria.coordinacion.calidad.requerida = true;
  asesoria.coordinacion.calidad.estado = todasCompletas ? "PENDIENTE" : asesoria.flujo.etapa === "REPROCESO" ? "REPROCESO" : "SIN_REVISAR";
  asesoria.flujo.etapa = todasCompletas ? "PENDIENTE_CALIDAD" : asesoria.flujo.etapa === "REPROCESO" ? "REPROCESO" : "EN_INSTALACION";
  await asesoria.save();
  await cerrarAlertaFlujo(`asignacion:${asesoria._id}:${asignacion._id}`);
  if (todasCompletas) await crearAlertaInstalacionCompleta(asesoria);
  return asesoria;
};

export const enviarTrabajoAVentas = async (id) => {
  const asesoria = await obtenerOrden(id);
  if (asesoria.coordinacion.calidad?.estado !== "APROBADA") throw new Error("El coordinador debe aprobar calidad antes de finalizar");
  validarSinNovedadesBloqueantes(asesoria);
  const accesoriosPendientes = (asesoria.accesorios || []).filter((item) => Number(item.cantidadPendiente || 0) > 0);
  if (accesoriosPendientes.length) {
    const detalle = accesoriosPendientes.map((item) => `${item.nombre}: faltan ${item.cantidadPendiente}`).join(", ");
    throw new Error(`No se puede enviar a Ventas. Faltan accesorios por recibir: ${detalle}`);
  }
  if (!["PENDIENTE_CALIDAD", "EN_INSTALACION", "MATERIAL_LISTO"].includes(asesoria.flujo.etapa)) throw new Error("El trabajo no esta listo para finalizar");
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
  const cerrarGarantia = garantiaSinCobro && !asesoria.autorizaciones?.requeridas;
  asesoria.flujo.etapa = cerrarGarantia ? "FINALIZADA" : "PENDIENTE_PAGO";
  asesoria.flujo.fechaEnvioVentas = garantiaSinCobro ? null : new Date();
  asesoria.flujo.fechaFinalizacion = cerrarGarantia ? new Date() : null;
  if (cerrarGarantia) asesoria.garantia.estado = "FINALIZADA";
  if (garantiaSinCobro) asesoria.pago.estado = "NO_APLICA";
  await asesoria.save();
  if (!garantiaSinCobro) await crearAlertaServicioListoPago(asesoria);
  await cerrarAlertaFlujo(`material-listo:${asesoria._id}`);
  await cerrarAlertaFlujo(`instalacion-completa:${asesoria._id}`);
  return asesoria;
};

export const revisarCalidad = async (id, data, user) => {
  if (!["COORDINADOR", "ADMIN", "SUPERUSUARIO"].includes(user.rol)) throw new Error("Solo coordinacion puede revisar calidad");
  const asesoria = await obtenerOrden(id);
  validarSinNovedadesBloqueantes(asesoria);
  const calidad = asesoria.coordinacion.calidad;
  if (calidad.estado === "APROBADA") {
    if (data.decision !== "APROBAR") throw new Error("La revision de calidad ya fue aprobada");
    if (!["PENDIENTE_PAGO", "FINALIZADA"].includes(asesoria.flujo.etapa)) await enviarTrabajoAVentas(id);
    return { orden: await Asesoria.findById(id), aviso: await avisarVehiculoListo(id) };
  }
  const seleccionadas = validarRevisionCalidad(asesoria, data);
  if ((asesoria.accesorios || []).some((a) => Number(a.cantidadPendiente || 0) > 0)) throw new Error("Faltan accesorios por recibir antes de cerrar calidad");
  const fecha = new Date();
  const revision = { decision: data.decision, observacion: data.observacion.trim(), fecha, usuarioId: user._id, usuarioNombre: user.nombre || user.rol,
    asignaciones: (data.decision === "APROBAR" ? asesoria.coordinacion.asignaciones : seleccionadas).map((a) => ({ asignacionId: a._id, servicio: a.servicio, descripcion: a.descripcion, instaladorId: a.instaladorId, instaladorNombre: a.instaladorNombre, fechaInicio: a.fechaInicio, fechaFinalizacion: a.fechaFinalizacion })) };
  if (data.decision === "RECORTE") {
    const responsable = seleccionadas[0];
    const novedadId = new mongoose.Types.ObjectId();
    revision.novedadId = novedadId;
    asesoria.novedades.push({ _id: novedadId, tipo: "REPETICION_CORTE", descripcion: `Calidad: ${revision.observacion}`, responsableCosto: "INSTALADOR", afectaMaterial: true,
      afectaPrecio: false, valorImpacto: 0, serviciosAfectados: data.lineasRecorte, instaladorId: responsable.instaladorId, instaladorNombre: responsable.instaladorNombre,
      estado: "PENDIENTE", usuarioId: user._id, usuarioNombre: revision.usuarioNombre, usuarioRol: user.rol, fecha });
    asesoria.situacionActual = "NOVEDAD_ABIERTA";
  }
  calidad.requerida = true;
  calidad.estado = data.decision === "APROBAR" ? "APROBADA" : "REPROCESO";
  calidad.revisiones.push(revision);
  if (data.decision !== "APROBAR") {
    for (const a of seleccionadas) { a.estado = data.decision === "RECORTE" ? "ESPERANDO_MATERIAL" : "PENDIENTE"; a.fechaInicio = null; a.fechaFinalizacion = null; a.observacion = revision.observacion; }
    asesoria.flujo.etapa = "REPROCESO";
  } else {
    asesoria.flujo.etapa = "PENDIENTE_CALIDAD";
    calidad.aviso = { estado: "PENDIENTE" };
  }
  asesoria.auditoria.push({ accion: `CALIDAD_${data.decision}`, descripcion: revision.observacion, usuarioId: user._id, usuarioNombre: revision.usuarioNombre, fecha });
  await asesoria.save();
  const alertas = [cerrarAlertaFlujo(`instalacion-completa:${asesoria._id}`)];
  if (data.decision === "RECORTE") alertas.push(crearAlertaSolicitudNovedad(asesoria, asesoria.novedades.id(revision.novedadId)));
  if (data.decision === "CORREGIR") alertas.push(crearAlertasInstaladores({ ...asesoria.toObject(), coordinacion: { asignaciones: seleccionadas } }));
  for (const resultado of await Promise.allSettled(alertas)) if (resultado.status === "rejected") console.error("Aviso de calidad pendiente:", resultado.reason.message);
  if (data.decision === "APROBAR") {
    const orden = await enviarTrabajoAVentas(id);
    return { orden, aviso: await avisarVehiculoListo(id) };
  }
  return { orden: asesoria };
};
