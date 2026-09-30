import Rollo from "../rollos/rollo.model.js";
import Retazo from "../retazos/retazo.model.js";
import Asesoria from "./asesoria.model.js";
import Corte from "../cortes/corte.model.js";
import Venta from "../ventas/venta.model.js";
import mongoose from "mongoose";
import {
  cerrarAlertaSolicitudNovedad,
  crearAlertaServicioAsesor,
  crearAlertaServicioListoPago,
  crearAlertaSolicitudNovedad,
  crearAlertaSolicitudGarantia,
  cerrarAlertaSolicitudGarantia,
} from "../alertas/alerta.service.js";

const redondearMetros = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const texto = (value) => String(value || "").trim();
const mayusculas = (value) => texto(value).toUpperCase();
const soloDigitos = (value) => texto(value).replace(/\D/g, "");

const escaparRegex = (value) =>
  texto(value).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listarAsesorias = async (filtros, user) => {
  const query = {};
  const esAccesoTotal = ["SUPERUSUARIO", "ADMIN"].includes(user.rol);

  if (!esAccesoTotal) {
    query.creadoPor = user._id;
  } else if (
    filtros.asesorId &&
    mongoose.Types.ObjectId.isValid(filtros.asesorId)
  ) {
    query.creadoPor = new mongoose.Types.ObjectId(filtros.asesorId);
  }

  if (filtros.estado) query.estado = filtros.estado;
  if (filtros.estadoPago) query["pago.estado"] = filtros.estadoPago;
  if (filtros.metodoPago) {
    query["comercial.metodoPagoPrevisto"] = filtros.metodoPago;
  }
  if (filtros.situacion) query.situacionActual = filtros.situacion;
  if (filtros.garantia === "NO_APLICA") query["garantia.esGarantia"] = false;
  if (["PENDIENTE", "APROBADA", "RECHAZADA", "FINALIZADA"].includes(filtros.garantia)) {
    query["garantia.esGarantia"] = true;
    query["garantia.estado"] = filtros.garantia;
  }

  if (filtros.desde || filtros.hasta) {
    query.createdAt = {};
    if (filtros.desde) query.createdAt.$gte = new Date(`${filtros.desde}T00:00:00.000`);
    if (filtros.hasta) query.createdAt.$lte = new Date(`${filtros.hasta}T23:59:59.999`);
  }

  const busqueda = escaparRegex(filtros.buscar);
  if (busqueda) {
    const regex = new RegExp(busqueda, "i");
    query.$or = [
      { codigo: regex },
      { "cliente.cedula": regex },
      { "cliente.nombre": regex },
      { "vehiculo.placa": regex },
      { "vehiculo.marca": regex },
      { "vehiculo.modelo": regex },
      { asesorNombre: regex },
    ];
  }

  const page = Math.max(Number(filtros.page || 1), 1);
  const limit = Math.min(Math.max(Number(filtros.limit || 10), 5), 50);
  const skip = (page - 1) * limit;

  const [items, total, asesores, resumen] = await Promise.all([
    Asesoria.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Asesoria.countDocuments(query),
    esAccesoTotal
      ? Asesoria.aggregate([
          {
            $group: {
              _id: "$creadoPor",
              nombre: { $first: "$asesorNombre" },
            },
          },
          { $sort: { nombre: 1 } },
        ])
      : Promise.resolve([]),
    Asesoria.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          valorAcordado: { $sum: "$comercial.totalAcordado" },
          descuentos: { $sum: "$comercial.descuento" },
          valorRecibido: { $sum: "$pago.valorRecibido" },
        },
      },
    ]),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    asesores: asesores.map((asesor) => ({
      id: asesor._id,
      nombre: asesor.nombre || "ASESOR",
    })),
    alcance: esAccesoTotal ? "TODOS" : "PROPIOS",
    resumen: {
      cantidad: total,
      valorAcordado: resumen[0]?.valorAcordado || 0,
      descuentos: resumen[0]?.descuentos || 0,
      valorRecibido: resumen[0]?.valorRecibido || 0,
    },
  };
};

const prepararDatosAsesoria = (data) => {
  const cedula = soloDigitos(data.cliente?.cedula);
  const placa = mayusculas(data.vehiculo?.placa).replace(/\s+/g, "");
  const recepcion = {
    tieneRayones: Boolean(data.recepcion?.tieneRayones),
    detalleRayones: mayusculas(data.recepcion?.detalleRayones),
    dejaObjetos: Boolean(data.recepcion?.dejaObjetos),
    detalleObjetos: mayusculas(data.recepcion?.detalleObjetos),
    observaciones: mayusculas(data.recepcion?.observaciones),
  };
  let valorVenta = Math.round(Number(data.comercial?.valorVenta || 0));
  const aplicaDescuento = Boolean(data.comercial?.aplicaDescuento);
  const descuento = aplicaDescuento
    ? Math.round(Number(data.comercial?.descuento || 0))
    : 0;
  let totalAcordado = Math.max(valorVenta - descuento, 0);
  const metodosPago = [
    "POR_DEFINIR",
    "EFECTIVO",
    "TRANSFERENCIA",
    "TARJETA",
    "CREDITO",
    "MIXTO",
  ];
  const metodoPagoPrevisto = metodosPago.includes(data.comercial?.metodoPagoPrevisto)
    ? data.comercial.metodoPagoPrevisto
    : "POR_DEFINIR";
  const polarizados = (data.polarizados || []).map((item) => ({
    material: mayusculas(item.material),
    porcentaje: mayusculas(item.porcentaje),
    partes: (item.partes || []).map(mayusculas).filter(Boolean),
    valor: Math.round(Number(item.valor || 0)),
  })).filter((item) => item.material && item.porcentaje && item.partes.length);
  const ppf = (data.ppf || []).map((item) => ({
    referencia: mayusculas(item.referencia),
    aplicacion: ["INTERIOR", "EXTERIOR", "COMPLETO", "PIEZAS"].includes(item.aplicacion)
      ? item.aplicacion
      : "PIEZAS",
    piezas: (item.piezas || []).map(mayusculas).filter(Boolean),
    valor: Math.round(Number(item.valor || 0)),
  })).filter((item) => item.referencia && (item.aplicacion !== "PIEZAS" || item.piezas.length));
  const serviciosAdicionales = (data.serviciosAdicionales || []).map((item) => ({
    tipo: mayusculas(item.tipo),
    detalle: mayusculas(item.detalle),
    valor: Math.round(Number(item.valor || 0)),
  })).filter((item) => item.tipo);
  const garantia = {
    esGarantia: Boolean(data.garantia?.esGarantia),
    tipo: mayusculas(data.garantia?.tipo),
    motivo: mayusculas(data.garantia?.motivo),
    instalador: mayusculas(data.garantia?.instalador),
    estado: data.garantia?.esGarantia ? "PENDIENTE" : "NO_APLICA",
    responsable: "POR_DEFINIR",
  };
  valorVenta = [...polarizados, ...ppf, ...serviciosAdicionales]
    .reduce((total, item) => total + Number(item.valor || 0), 0);
  totalAcordado = Math.max(valorVenta - descuento, 0);

  if (cedula.length < 5 || cedula.length > 15) {
    throw new Error("La cedula debe tener entre 5 y 15 numeros");
  }
  if (!texto(data.cliente?.nombre)) {
    throw new Error("Ingrese el nombre del cliente");
  }
  if (placa.length < 5 || placa.length > 10) {
    throw new Error("La placa debe tener entre 5 y 10 caracteres");
  }
  if (!texto(data.vehiculo?.marca) || !texto(data.vehiculo?.modelo)) {
    throw new Error("Complete la marca y el modelo del vehiculo");
  }
  if (soloDigitos(data.vehiculo?.anio).length !== 4) {
    throw new Error("Ingrese el año del vehiculo con 4 numeros");
  }
  if (recepcion.tieneRayones && !recepcion.detalleRayones) {
    throw new Error("Describa los rayones encontrados");
  }
  if (recepcion.dejaObjetos && !recepcion.detalleObjetos) {
    throw new Error("Describa los objetos que quedan en el vehiculo");
  }
  if (!Number.isFinite(valorVenta) || (!garantia.esGarantia && valorVenta <= 0)) {
    throw new Error("Ingrese el valor acordado de la venta");
  }
  if (!Number.isFinite(descuento) || descuento < 0 || descuento > valorVenta) {
    throw new Error("El descuento no puede superar el valor de la venta");
  }
  if (!polarizados.length && !ppf.length && !serviciosAdicionales.length) {
    throw new Error("Agregue al menos un servicio para el vehiculo");
  }
  if (!garantia.esGarantia && [...polarizados, ...ppf, ...serviciosAdicionales].some((item) => item.valor <= 0)) {
    throw new Error("Ingrese el precio de cada servicio");
  }
  if (garantia.esGarantia && !garantia.motivo) {
    throw new Error("Indique el motivo de la garantia");
  }

  return {
    cliente: {
      cedula,
      nombre: mayusculas(data.cliente.nombre),
      telefono: texto(data.cliente.telefono),
      correo: texto(data.cliente.correo).toLowerCase(),
    },
    vehiculo: {
      placa,
      marca: mayusculas(data.vehiculo.marca),
      modelo: mayusculas(data.vehiculo.modelo),
      anio: soloDigitos(data.vehiculo.anio).slice(0, 4),
      color: mayusculas(data.vehiculo.color),
    },
    recepcion,
    polarizados,
    ppf,
    serviciosAdicionales,
    garantia,
    comercial: {
      valorVenta,
      aplicaDescuento,
      descuento,
      totalAcordado,
      metodoPagoPrevisto,
    },
  };
};

export const crearBorradorAsesoria = async (data, user) => {
  const datosAsesoria = prepararDatosAsesoria(data);
  const asesoria = await Asesoria.create({
    ...datosAsesoria,
    codigo: `ASE-${Date.now()}`,
    pago: {
      estado: "PENDIENTE",
      valorRecibido: 0,
    },
    creadoPor: user._id,
    asesorNombre: mayusculas(user.nombre || "ASESOR"),
    asesorRol: user.rol || "ASESOR",
    estado: "APROBADA",
    flujo: {
      etapa: datosAsesoria.garantia.esGarantia ? "PENDIENTE_GARANTIA" : "PENDIENTE_INVENTARIO",
      fechaEnvioInventario: datosAsesoria.garantia.esGarantia ? null : new Date(),
    },
  });

  try {
    if (asesoria.garantia.esGarantia) {
      await crearAlertaSolicitudGarantia(asesoria);
    } else {
      await crearAlertaServicioAsesor(asesoria);
    }
  } catch (error) {
    console.error("No se pudo crear la alerta del servicio de asesor:", error.message);
  }
  return asesoria;
};

export const actualizarAsesoria = async (id, data, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Servicio no valido");
  }
  if (!["ADMIN", "SUPERUSUARIO"].includes(user.rol)) {
    throw new Error("Solo un administrador puede editar el servicio");
  }

  const actual = await Asesoria.findById(id);
  if (!actual) throw new Error("Servicio no encontrado");

  const datosAsesoria = prepararDatosAsesoria(data);
  if (datosAsesoria.garantia.esGarantia && actual.garantia?.esGarantia) {
    datosAsesoria.garantia = {
      ...datosAsesoria.garantia,
      estado: actual.garantia.estado || datosAsesoria.garantia.estado,
      responsable: actual.garantia.responsable || datosAsesoria.garantia.responsable,
      observacionRevision: actual.garantia.observacionRevision || "",
      revisadoPorId: actual.garantia.revisadoPorId || null,
      revisadoPorNombre: actual.garantia.revisadoPorNombre || "",
      fechaRevision: actual.garantia.fechaRevision || null,
    };
  }
  const actualizada = await Asesoria.findByIdAndUpdate(
    id,
    {
      $set: datosAsesoria,
      $push: {
        auditoria: {
          accion: "EDICION_ADMINISTRATIVA",
          descripcion: "Servicio del asesor corregido por administracion",
          usuarioId: user._id,
          usuarioNombre: mayusculas(user.nombre || user.rol),
          fecha: new Date(),
        },
      },
    },
    { new: true, runValidators: true }
  );

  return actualizada;
};

const TIPOS_NOVEDAD = [
  "CANCELACION_TOTAL",
  "CANCELACION_PARCIAL",
  "CAMBIO_CLIENTE",
  "FALTA_MATERIAL",
  "MATERIAL_DEFECTUOSO",
  "ROLLO_EQUIVOCADO",
  "REPETICION_CORTE",
  "DANO_ENCONTRADO",
  "TRABAJO_PENDIENTE",
  "ERROR_REGISTRO",
  "GARANTIA",
  "OTRA",
];

const TIPOS_NOVEDAD_INVENTARIO = [
  "FALTA_MATERIAL",
  "MATERIAL_DEFECTUOSO",
  "ROLLO_EQUIVOCADO",
  "REPETICION_CORTE",
  "ERROR_REGISTRO",
  "DANO_ENCONTRADO",
  "TRABAJO_PENDIENTE",
  "OTRA",
];

const RESPONSABLES_COSTO = [
  "NO_APLICA",
  "POR_DEFINIR",
  "CLIENTE",
  "EMPRESA",
  "ASESOR",
  "INSTALADOR",
  "PROVEEDOR",
];

export const registrarNovedadAsesoria = async (id, data, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Servicio no valido");
  const esAdministrador = ["ADMIN", "SUPERUSUARIO"].includes(user.rol);
  const esInventario = user.rol === "INVENTARIO";
  if (!esAdministrador && !esInventario) throw new Error("No tiene permiso para reportar esta novedad");

  const asesoria = await Asesoria.findById(id);
  if (!asesoria) throw new Error("Servicio no encontrado");

  const tipo = mayusculas(data.tipo);
  const descripcion = mayusculas(data.descripcion);
  const responsableCosto = RESPONSABLES_COSTO.includes(data.responsableCosto)
    ? data.responsableCosto
    : "NO_APLICA";
  const valorImpacto = Math.round(Number(data.valorImpacto || 0));

  if (!TIPOS_NOVEDAD.includes(tipo)) throw new Error("Seleccione un tipo de novedad valido");
  if (esInventario && !TIPOS_NOVEDAD_INVENTARIO.includes(tipo)) {
    throw new Error("Inventario solo puede reportar novedades operativas");
  }
  if (descripcion.length < 5) throw new Error("Describa la novedad con al menos 5 caracteres");
  if (!Number.isFinite(valorImpacto) || valorImpacto < 0) throw new Error("El valor del impacto no es valido");

  if (tipo === "CANCELACION_TOTAL" && asesoria.pago?.estado === "PAGADO") {
    throw new Error("El servicio ya esta pagado. Registre primero la devolucion antes de cancelarlo");
  }

  const situacionPorTipo = {
    CANCELACION_TOTAL: "CANCELADA",
    CAMBIO_CLIENTE: "PENDIENTE_CLIENTE",
    FALTA_MATERIAL: "ESPERANDO_MATERIAL",
    TRABAJO_PENDIENTE: "TRABAJO_PENDIENTE",
  };
  const situacionActual = situacionPorTipo[tipo] || "NOVEDAD_ABIERTA";
  const novedad = {
    tipo,
    descripcion,
    responsableCosto,
    afectaMaterial: Boolean(data.afectaMaterial),
    afectaPrecio: Boolean(data.afectaPrecio),
    valorImpacto,
    estado: esAdministrador ? "APROBADA" : "PENDIENTE",
    usuarioId: user._id,
    usuarioNombre: mayusculas(user.nombre || user.rol),
    usuarioRol: user.rol,
    fecha: new Date(),
  };
  const set = {
    situacionActual: esAdministrador ? situacionActual : "NOVEDAD_ABIERTA",
  };

  if (tipo === "CANCELACION_TOTAL" && esAdministrador) {
    set.estado = "CANCELADA";
    set["flujo.etapa"] = "CANCELADA";
    set["flujo.fechaFinalizacion"] = new Date();

    const venta = await Venta.findOne({ asesoriaId: asesoria._id });
    if (venta?.estado === "PENDIENTE") {
      venta.estado = "ANULADA";
      venta.auditoria.push({
        accion: "ANULACION_POR_NOVEDAD",
        descripcion: descripcion,
        usuarioId: user._id,
        usuarioNombre: mayusculas(user.nombre || user.rol),
        usuarioRol: user.rol,
      });
      await venta.save();
    }
  }

  const actualizada = await Asesoria.findByIdAndUpdate(
    id,
    {
      $set: set,
      $push: {
        novedades: novedad,
        auditoria: {
          accion: tipo,
          descripcion,
          usuarioId: user._id,
          usuarioNombre: mayusculas(user.nombre || user.rol),
          fecha: new Date(),
        },
      },
    },
    { new: true, runValidators: true }
  );

  if (esInventario) {
    const novedadGuardada = actualizada.novedades.at(-1);
    try {
      await crearAlertaSolicitudNovedad(actualizada, novedadGuardada);
    } catch (error) {
      console.error("No se pudo crear la alerta de novedad:", error.message);
    }
  }

  return actualizada;
};

export const revisarNovedadAsesoria = async (id, novedadId, data, user) => {
  if (!["ADMIN", "SUPERUSUARIO"].includes(user.rol)) {
    throw new Error("Solo administracion puede revisar solicitudes");
  }
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(novedadId)) {
    throw new Error("Solicitud no valida");
  }

  const asesoria = await Asesoria.findById(id);
  if (!asesoria) throw new Error("Servicio no encontrado");
  const novedad = asesoria.novedades.id(novedadId);
  if (!novedad) throw new Error("Novedad no encontrada");
  if (novedad.estado !== "PENDIENTE") throw new Error("Esta solicitud ya fue revisada");

  const decision = mayusculas(data.decision);
  if (!["APROBAR", "RECHAZAR"].includes(decision)) throw new Error("Seleccione una decision valida");

  novedad.estado = decision === "APROBAR" ? "APROBADA" : "RECHAZADA";
  novedad.revisadoPorId = user._id;
  novedad.revisadoPorNombre = mayusculas(user.nombre || user.rol);
  novedad.fechaRevision = new Date();
  novedad.observacionRevision = mayusculas(data.observacion);

  if (decision === "APROBAR") {
    const situacionPorTipo = {
      FALTA_MATERIAL: "ESPERANDO_MATERIAL",
      CAMBIO_CLIENTE: "PENDIENTE_CLIENTE",
      TRABAJO_PENDIENTE: "TRABAJO_PENDIENTE",
    };
    asesoria.situacionActual = situacionPorTipo[novedad.tipo] || "NOVEDAD_ABIERTA";
  } else {
    const tieneOtraPendiente = asesoria.novedades.some(
      (item) => String(item._id) !== String(novedad._id) && item.estado === "PENDIENTE"
    );
    if (!tieneOtraPendiente && asesoria.situacionActual === "NOVEDAD_ABIERTA") {
      asesoria.situacionActual = "NORMAL";
    }
  }

  asesoria.auditoria.push({
    accion: `NOVEDAD_${novedad.estado}`,
    descripcion: novedad.observacionRevision || `${novedad.tipo} ${novedad.estado}`,
    usuarioId: user._id,
    usuarioNombre: mayusculas(user.nombre || user.rol),
    fecha: new Date(),
  });
  await asesoria.save();
  try {
    await cerrarAlertaSolicitudNovedad(asesoria._id, novedad._id);
  } catch (error) {
    console.error("No se pudo cerrar la alerta de novedad:", error.message);
  }
  return asesoria;
};

export const revisarGarantiaAsesoria = async (id, data, user) => {
  if (!["ADMIN", "SUPERUSUARIO"].includes(user.rol)) {
    throw new Error("Solo administracion puede revisar garantias");
  }
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Servicio no valido");
  const asesoria = await Asesoria.findById(id);
  if (!asesoria?.garantia?.esGarantia) throw new Error("La orden no corresponde a una garantia");
  if (asesoria.garantia.estado !== "PENDIENTE") throw new Error("Esta garantia ya fue revisada");

  const decision = mayusculas(data.decision);
  const responsable = mayusculas(data.responsable);
  const responsables = ["EMPRESA", "INSTALADOR", "PROVEEDOR", "CLIENTE"];
  if (!["APROBAR", "RECHAZAR"].includes(decision)) throw new Error("Seleccione una decision valida");
  if (decision === "APROBAR" && !responsables.includes(responsable)) throw new Error("Seleccione quien responde por la garantia");
  if (responsable === "INSTALADOR" && !texto(data.instalador || asesoria.garantia.instalador)) {
    throw new Error("Ingrese el instalador responsable");
  }
  if (decision === "RECHAZAR" && texto(data.observacion).length < 5) {
    throw new Error("Indique el motivo del rechazo");
  }

  asesoria.garantia.estado = decision === "APROBAR" ? "APROBADA" : "RECHAZADA";
  asesoria.garantia.responsable = decision === "APROBAR" ? responsable : "CLIENTE";
  if (decision === "APROBAR") {
    asesoria.garantia.tipo = responsable === "CLIENTE" ? "GARANTIA" : `GARANTIA_${responsable}`;
  }
  asesoria.garantia.instalador = responsable === "INSTALADOR"
    ? mayusculas(data.instalador || asesoria.garantia.instalador)
    : asesoria.garantia.instalador;
  asesoria.garantia.observacionRevision = mayusculas(data.observacion);
  asesoria.garantia.revisadoPorId = user._id;
  asesoria.garantia.revisadoPorNombre = mayusculas(user.nombre || user.rol);
  asesoria.garantia.fechaRevision = new Date();
  asesoria.flujo.etapa = decision === "APROBAR" ? "PENDIENTE_INVENTARIO" : "CANCELADA";
  asesoria.flujo.fechaEnvioInventario = decision === "APROBAR" ? new Date() : null;
  if (decision === "RECHAZAR") asesoria.estado = "CANCELADA";
  asesoria.auditoria.push({
    accion: `GARANTIA_${asesoria.garantia.estado}`,
    descripcion: asesoria.garantia.observacionRevision || `Responsable: ${responsable}`,
    usuarioId: user._id,
    usuarioNombre: mayusculas(user.nombre || user.rol),
    fecha: new Date(),
  });
  await asesoria.save();

  try {
    await cerrarAlertaSolicitudGarantia(asesoria._id);
    if (decision === "APROBAR") await crearAlertaServicioAsesor(asesoria);
  } catch (error) {
    console.error("No se pudo sincronizar la alerta de garantia:", error.message);
  }
  return asesoria;
};

export const obtenerAsesoriaPorId = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Servicio no valido");
  }
  const asesoria = await Asesoria.findById(id).lean();
  if (!asesoria) throw new Error("Servicio no encontrado");
  return asesoria;
};

export const enviarAsesoriaAVentas = async (id) => {
  const asesoria = await obtenerAsesoriaPorId(id);
  if (!["PENDIENTE_INVENTARIO", "EN_PROCESO"].includes(asesoria.flujo?.etapa)) {
    throw new Error("Esta orden ya fue enviada o no esta disponible para finalizar");
  }
  if (asesoria.garantia?.esGarantia && asesoria.garantia.estado !== "APROBADA") {
    throw new Error("La garantia debe estar aprobada antes de finalizar el trabajo");
  }
  if ((asesoria.novedades || []).some((item) => item.estado === "PENDIENTE")) {
    throw new Error("La orden tiene una solicitud pendiente de revision administrativa");
  }
  const cortes = await Corte.find({ asesoriaId: id })
    .select("asesoriaLinea tipoCorte tipoCorteDetalle")
    .lean();
  const faltantes = [];
  (asesoria.polarizados || []).forEach((linea, index) => {
    const etiqueta = `POLARIZADO ${index + 1}`;
    const existe = cortes.some((corte) => corte.asesoriaLinea === etiqueta);
    if (!existe) faltantes.push(`${etiqueta}: ${(linea.partes || []).join(" + ")}`);
  });
  (asesoria.ppf || []).forEach((_, index) => {
    const etiqueta = `PPF ${index + 1}`;
    if (!cortes.some((corte) => corte.asesoriaLinea === etiqueta)) faltantes.push(etiqueta);
  });
  if (faltantes.length) {
    throw new Error(`Faltan cortes por registrar: ${faltantes.join(", ")}`);
  }
  const esGarantiaSinCobro = Boolean(asesoria.garantia?.esGarantia) && Number(asesoria.comercial?.totalAcordado || 0) <= 0;
  const actualizada = await Asesoria.findByIdAndUpdate(
    id,
    { $set: esGarantiaSinCobro ? {
      "garantia.estado": "FINALIZADA",
      "flujo.etapa": "FINALIZADA",
      "flujo.fechaFinalizacion": new Date(),
    } : {
      "flujo.etapa": "PENDIENTE_PAGO",
      "flujo.fechaEnvioVentas": new Date(),
    } },
    { new: true }
  );
  if (!esGarantiaSinCobro) await crearAlertaServicioListoPago(actualizada);
  return actualizada;
};

export const buscarClienteAsesoria = async (cedula) => {
  const cedulaNormalizada = soloDigitos(cedula);
  if (cedulaNormalizada.length < 5) return null;

  const ultima = await Asesoria.findOne({
    "cliente.cedula": cedulaNormalizada,
  })
    .sort({ createdAt: -1 })
    .select("cliente vehiculo createdAt")
    .lean();

  return ultima;
};

export const buscarClientesAsesoria = async (termino) => {
  const cedula = soloDigitos(termino);
  if (cedula.length < 3) return [];

  const coincidencias = await Asesoria.find({
    "cliente.cedula": new RegExp(escaparRegex(cedula), "i"),
  })
    .sort({ createdAt: -1 })
    .select("cliente vehiculo createdAt")
    .limit(40)
    .lean();

  const clientesUnicos = new Map();
  coincidencias.forEach((item) => {
    const clave = item.cliente?.cedula;
    if (clave && !clientesUnicos.has(clave)) clientesUnicos.set(clave, item);
  });

  return Array.from(clientesUnicos.values()).slice(0, 8);
};

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
