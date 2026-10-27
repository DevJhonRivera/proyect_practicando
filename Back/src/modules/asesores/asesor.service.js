import Rollo from "../rollos/rollo.model.js";
import Retazo from "../retazos/retazo.model.js";
import Asesoria from "./asesoria.model.js";
import Corte from "../cortes/corte.model.js";
import Venta from "../ventas/venta.model.js";
import User from "../users/user.model.js";
import Accesorio from "../accesorios/accesorio.model.js";
import mongoose from "mongoose";
import { recalcularComercial, validarSinNovedadesBloqueantes } from "./asesoriaWorkflow.utils.js";
import {
  cerrarAlertaSolicitudNovedad,
  crearAlertaServicioAsesor,
  crearAlertaServicioListoPago,
  crearAlertaSolicitudNovedad,
  crearAlertaSolicitudGarantia,
  cerrarAlertaSolicitudGarantia,
  cerrarAlertaVentaPendiente,
  sincronizarAlertasAccesorios,
} from "../alertas/alerta.service.js";

const redondearMetros = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const texto = (value) => String(value || "").trim();
const mayusculas = (value) => texto(value).toUpperCase();
const soloDigitos = (value) => texto(value).replace(/\D/g, "");

const agruparPpfPorReferencia = (items = []) => {
  const grupos = new Map();

  items.forEach((item) => {
    if (!item.referencia || !item.piezas?.length) return;
    const existente = grupos.get(item.referencia) || {
      ...item,
      piezas: [],
      valor: 0,
      aplicaciones: new Set(),
    };
    existente.piezas = [...new Set([...existente.piezas, ...item.piezas])];
    if (existente.valor <= 0 && item.valor > 0) existente.valor = item.valor;
    existente.aplicaciones.add(item.aplicacion === "PIEZAS" ? "EXTERIOR" : item.aplicacion);
    grupos.set(item.referencia, existente);
  });

  return [...grupos.values()].map(({ aplicaciones, ...item }) => ({
    ...item,
    aplicacion: aplicaciones.has("COMPLETO") || (aplicaciones.has("INTERIOR") && aplicaciones.has("EXTERIOR"))
      ? "COMPLETO"
      : [...aplicaciones][0] || "EXTERIOR",
  }));
};

const escaparRegex = (value) =>
  texto(value).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const prepararAccesorios = async (items = [], anteriores = []) => {
  const agrupados = new Map();
  items.forEach((item) => {
    const id = texto(item.accesorioId);
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Seleccione un accesorio valido");
    const cantidad = Math.max(1, Math.floor(Number(item.cantidad || 1)));
    const precioUnitario = Math.max(0, Math.round(Number(item.precioUnitario || 0)));
    const actual = agrupados.get(id) || { accesorioId: id, cantidad: 0, precioUnitario };
    actual.cantidad += cantidad;
    actual.precioUnitario = precioUnitario;
    agrupados.set(id, actual);
  });
  const ids = [...agrupados.keys()];
  const productos = await Accesorio.find({ _id: { $in: ids }, activo: { $ne: false } }).lean();
  if (productos.length !== ids.length) throw new Error("Uno de los accesorios ya no esta disponible");
  const porId = new Map(productos.map((item) => [String(item._id), item]));
  const descontadoAnterior = anteriores.reduce((mapa, item) => {
    const id = String(item.accesorioId);
    mapa.set(id, (mapa.get(id) || 0) + Number(item.cantidadDescontada ?? item.cantidad ?? 0));
    return mapa;
  }, new Map());
  return [...agrupados.values()].map((item) => {
    const producto = porId.get(item.accesorioId);
    const disponible = Number(producto.stock || 0) + Number(descontadoAnterior.get(item.accesorioId) || 0);
    const cantidadDescontada = Math.min(item.cantidad, disponible);
    const cantidadPendiente = item.cantidad - cantidadDescontada;
    return {
      accesorioId: producto._id,
      codigo: producto.codigo,
      categoria: producto.categoria,
      nombre: producto.nombre,
      marca: producto.marca,
      referencia: producto.referencia,
      cantidad: item.cantidad,
      cantidadDescontada,
      cantidadPendiente,
      estadoInventario: cantidadPendiente > 0 ? "PENDIENTE_STOCK" : "RESERVADO",
      costoUnitario: producto.costoUnitario || 0,
      precioUnitario: item.precioUnitario,
      valor: item.cantidad * item.precioUnitario,
    };
  });
};

const conciliarStockAccesorios = async (anteriores = [], nuevos = [], contexto = {}) => {
  const cantidades = (items) => items.reduce((mapa, item) => {
    const id = String(item.accesorioId);
    mapa.set(id, (mapa.get(id) || 0) + Number(item.cantidadDescontada ?? item.cantidad ?? 0));
    return mapa;
  }, new Map());
  const antes = cantidades(anteriores);
  const despues = cantidades(nuevos);
  const cambios = [...new Set([...antes.keys(), ...despues.keys()])]
    .map((id) => ({ id, delta: (despues.get(id) || 0) - (antes.get(id) || 0) }))
    .filter((item) => item.delta !== 0);
  const aplicados = [];
  try {
    for (const cambio of cambios) {
      const salida = cambio.delta > 0;
      const cantidad = Math.abs(cambio.delta);
      const filtro = { _id: cambio.id, activo: { $ne: false }, ...(salida ? { stock: { $gte: cantidad } } : {}) };
      const producto = await Accesorio.findOneAndUpdate(filtro, {
        $inc: { stock: salida ? -cantidad : cantidad },
        $push: { movimientos: {
          tipo: salida ? "SALIDA" : "ENTRADA",
          cantidad,
          motivo: salida ? "ASIGNADO A SERVICIO" : "DEVOLUCION POR EDICION DE SERVICIO",
          asesoriaId: contexto.asesoriaId || null,
          codigoOrden: contexto.codigo || "",
          usuarioId: contexto.user?._id || null,
          usuarioNombre: contexto.user?.nombre || "",
        } },
      }, { new: true });
      if (!producto) throw new Error("Stock insuficiente para uno de los accesorios seleccionados");
      aplicados.push(cambio);
    }
  } catch (error) {
    for (const cambio of aplicados.reverse()) {
      await Accesorio.updateOne({ _id: cambio.id }, { $inc: { stock: cambio.delta } });
    }
    throw error;
  }
  return async () => {
    for (const cambio of [...aplicados].reverse()) await Accesorio.updateOne({ _id: cambio.id }, { $inc: { stock: cambio.delta } });
  };
};

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
  const esGarantia = Boolean(data.garantia?.esGarantia);
  const recepcion = {
    tieneRayones: Boolean(data.recepcion?.tieneRayones),
    detalleRayones: mayusculas(data.recepcion?.detalleRayones),
    dejaObjetos: Boolean(data.recepcion?.dejaObjetos),
    detalleObjetos: mayusculas(data.recepcion?.detalleObjetos),
    observaciones: mayusculas(data.recepcion?.observaciones),
  };
  let valorVenta = esGarantia ? 0 : Math.round(Number(data.comercial?.valorVenta || 0));
  const aplicaDescuento = !esGarantia && Boolean(data.comercial?.aplicaDescuento);
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
  const metodoPagoPrevisto = !esGarantia && metodosPago.includes(data.comercial?.metodoPagoPrevisto)
    ? data.comercial.metodoPagoPrevisto
    : "POR_DEFINIR";
  const polarizados = (data.polarizados || []).map((item) => ({
    material: mayusculas(item.material),
    porcentaje: mayusculas(item.porcentaje),
    partes: (item.partes || []).map(mayusculas).filter(Boolean),
    valor: esGarantia ? 0 : Math.round(Number(item.valor || 0)),
  })).filter((item) => item.material && item.porcentaje && item.partes.length);
  const ppf = agruparPpfPorReferencia((data.ppf || []).map((item) => ({
    referencia: mayusculas(item.referencia),
    aplicacion: ["INTERIOR", "EXTERIOR", "COMPLETO", "PIEZAS"].includes(item.aplicacion)
      ? item.aplicacion
      : "EXTERIOR",
    piezas: (item.piezas || []).map(mayusculas).filter(Boolean),
    valor: esGarantia ? 0 : Math.round(Number(item.valor || 0)),
  })).filter((item) => item.referencia && item.piezas.length));
  const serviciosAdicionales = (data.serviciosAdicionales || []).map((item) => ({
    tipo: mayusculas(item.tipo),
    detalle: mayusculas(item.detalle),
    valor: esGarantia ? 0 : Math.round(Number(item.valor || 0)),
  })).filter((item) => item.tipo);
  const accesoriosEntrada = Array.isArray(data.accesorios) ? data.accesorios : [];
  const garantia = {
    esGarantia,
    tipo: mayusculas(data.garantia?.tipo),
    motivo: mayusculas(data.garantia?.motivo),
    instalador: mayusculas(data.garantia?.instalador),
    instaladorId: mongoose.Types.ObjectId.isValid(data.garantia?.instaladorId) ? data.garantia.instaladorId : null,
    costoMaterial: Math.max(Number(data.garantia?.costoMaterial || 0), 0),
    estado: data.garantia?.esGarantia ? "PENDIENTE" : "NO_APLICA",
    responsable: "POR_DEFINIR",
  };
  valorVenta = [...polarizados, ...ppf, ...serviciosAdicionales]
    .reduce((total, item) => total + Number(item.valor || 0), 0);
  totalAcordado = esGarantia ? 0 : Math.max(valorVenta - descuento, 0);

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
  if (!polarizados.length && !ppf.length && !serviciosAdicionales.length && !accesoriosEntrada.length) {
    throw new Error("Agregue al menos un servicio para el vehiculo");
  }
  if (!garantia.esGarantia && [...polarizados, ...ppf, ...serviciosAdicionales, ...accesoriosEntrada].some((item) => Number(item.valor || (Number(item.cantidad || 0) * Number(item.precioUnitario || 0))) <= 0)) {
    throw new Error("Ingrese el precio de cada servicio");
  }
  if (garantia.esGarantia && !garantia.motivo) {
    throw new Error("Indique el motivo de la garantia");
  }
  if (garantia.esGarantia && garantia.tipo === "GARANTIA_INSTALADOR" && !garantia.instaladorId) {
    throw new Error("Seleccione el instalador responsable de la garantia");
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
    accesoriosEntrada,
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
  const accesorios = await prepararAccesorios(datosAsesoria.accesoriosEntrada);
  delete datosAsesoria.accesoriosEntrada;
  if (datosAsesoria.garantia.esGarantia) {
    accesorios.forEach((item) => {
      item.precioUnitario = 0;
      item.valor = 0;
    });
  }
  datosAsesoria.accesorios = accesorios;
  datosAsesoria.comercial.valorVenta += accesorios.reduce((total, item) => total + item.valor, 0);
  datosAsesoria.comercial.totalAcordado = Math.max(datosAsesoria.comercial.valorVenta - datosAsesoria.comercial.descuento, 0);
  if (datosAsesoria.garantia?.tipo === "GARANTIA_INSTALADOR") {
    const instalador = await User.findOne({ _id: datosAsesoria.garantia.instaladorId, rol: "INSTALADOR", suspendido: { $ne: true } }).select("nombre").lean();
    if (!instalador) throw new Error("El instalador seleccionado no esta disponible");
    datosAsesoria.garantia.instalador = mayusculas(instalador.nombre);
  }
  const codigo = `ASE-${Date.now()}`;
  const revertirStock = await conciliarStockAccesorios([], accesorios, { codigo, user });
  let asesoria;
  try { asesoria = await Asesoria.create({
    ...datosAsesoria,
    codigo,
    pago: {
      estado: "PENDIENTE",
      valorRecibido: 0,
    },
    creadoPor: user._id,
    asesorNombre: mayusculas(user.nombre || "ASESOR"),
    asesorRol: user.rol || "ASESOR",
    estado: "APROBADA",
    flujo: {
      etapa: datosAsesoria.garantia.esGarantia ? "PENDIENTE_GARANTIA" : "PENDIENTE_COORDINACION",
      fechaEnvioInventario: null,
    },
  }); } catch (error) { await revertirStock(); throw error; }
  if (accesorios.length) {
    await Accesorio.updateMany({ "movimientos.codigoOrden": codigo }, { $set: { "movimientos.$[mov].asesoriaId": asesoria._id } }, { arrayFilters: [{ "mov.codigoOrden": codigo }] });
  }
  try { await sincronizarAlertasAccesorios(asesoria); } catch (error) { console.error("No se pudo crear la alerta de accesorios:", error.message); }

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
  const accesorios = await prepararAccesorios(datosAsesoria.accesoriosEntrada, actual.accesorios || []);
  delete datosAsesoria.accesoriosEntrada;
  if (datosAsesoria.garantia.esGarantia) {
    accesorios.forEach((item) => {
      item.precioUnitario = 0;
      item.valor = 0;
    });
  }
  datosAsesoria.accesorios = accesorios;
  datosAsesoria.comercial.valorVenta += accesorios.reduce((total, item) => total + item.valor, 0);
  datosAsesoria.comercial.totalAcordado = Math.max(datosAsesoria.comercial.valorVenta - datosAsesoria.comercial.descuento, 0);
  if (datosAsesoria.garantia?.tipo === "GARANTIA_INSTALADOR") {
    const instalador = await User.findOne({ _id: datosAsesoria.garantia.instaladorId, rol: "INSTALADOR", suspendido: { $ne: true } }).select("nombre").lean();
    if (!instalador) throw new Error("El instalador seleccionado no esta disponible");
    datosAsesoria.garantia.instalador = mayusculas(instalador.nombre);
  }
  const cortesExistentes = await Corte.exists({ asesoriaId: actual._id });
  const firmaMateriales = (origen) => JSON.stringify({
    polarizados: (origen.polarizados || []).map((item) => ({ material: item.material, porcentaje: item.porcentaje, partes: item.partes })),
    ppf: (origen.ppf || []).map((item) => ({ referencia: item.referencia, aplicacion: item.aplicacion, piezas: item.piezas })),
  });
  const cambioMateriales = firmaMateriales(actual) !== firmaMateriales(datosAsesoria);
  if (cortesExistentes && cambioMateriales) {
    throw new Error("No se pueden cambiar materiales o piezas porque la orden ya tiene cortes. Registre una novedad administrativa");
  }
  const ventaExistente = await Venta.exists({ asesoriaId: actual._id });
  const firmaComercial = (origen) => JSON.stringify({
    polarizados: (origen.polarizados || []).map((item) => Number(item.valor || 0)),
    ppf: (origen.ppf || []).map((item) => Number(item.valor || 0)),
    adicionales: (origen.serviciosAdicionales || []).map((item) => ({ tipo: item.tipo, valor: Number(item.valor || 0) })),
    accesorios: (origen.accesorios || []).map((item) => ({ id: String(item.accesorioId), cantidad: item.cantidad, precio: item.precioUnitario })),
    descuento: Number(origen.comercial?.descuento || 0),
  });
  if (ventaExistente && firmaComercial(actual) !== firmaComercial(datosAsesoria)) {
    throw new Error("No se pueden cambiar servicios, precios o descuentos porque la venta ya fue creada. Ajuste primero la venta y sus pagos");
  }
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
  const revertirStock = await conciliarStockAccesorios(actual.accesorios || [], accesorios, { asesoriaId: actual._id, codigo: actual.codigo, user });
  let actualizada;
  try { actualizada = await Asesoria.findByIdAndUpdate(
    id,
    {
      $set: {
        ...datosAsesoria,
        ...(cambioMateriales ? {
          "coordinacion.propuesta": [],
          "coordinacion.asignaciones": [],
          "coordinacion.estadoPropuesta": "PENDIENTE",
          "flujo.etapa": datosAsesoria.garantia.esGarantia && datosAsesoria.garantia.estado !== "APROBADA"
            ? "PENDIENTE_GARANTIA"
            : "PENDIENTE_COORDINACION",
          "flujo.fechaEnvioInventario": null,
        } : {}),
      },
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
  ); } catch (error) { await revertirStock(); throw error; }

  if (cambioMateriales && actualizada.flujo?.etapa === "PENDIENTE_COORDINACION") {
    try {
      await crearAlertaServicioAsesor(actualizada);
    } catch (error) {
      console.error("No se pudo notificar el cambio de material:", error.message);
    }
  }
  try { await sincronizarAlertasAccesorios(actualizada); } catch (error) { console.error("No se pudo actualizar la alerta de accesorios:", error.message); }

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
  const esCoordinador = user.rol === "COORDINADOR";
  if (!esAdministrador && !esInventario && !esCoordinador) throw new Error("No tiene permiso para reportar esta novedad");

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
  if (esCoordinador && tipo !== "REPETICION_CORTE") {
    throw new Error("Coordinacion solo puede solicitar repeticiones de corte");
  }
  if (descripcion.length < 5) throw new Error("Describa la novedad con al menos 5 caracteres");
  if (!Number.isFinite(valorImpacto) || valorImpacto < 0) throw new Error("El valor del impacto no es valido");

  if (tipo === "CANCELACION_TOTAL" && (["PARCIAL", "PAGADO"].includes(asesoria.pago?.estado) || Number(asesoria.pago?.valorRecibido || 0) > 0)) {
    throw new Error("El servicio tiene dinero recibido. Registre primero la devolucion completa antes de cancelarlo");
  }

  const situacionPorTipo = {
    CANCELACION_TOTAL: "CANCELADA",
    CAMBIO_CLIENTE: "PENDIENTE_CLIENTE",
    FALTA_MATERIAL: "ESPERANDO_MATERIAL",
    TRABAJO_PENDIENTE: "TRABAJO_PENDIENTE",
  };
  const situacionActual = situacionPorTipo[tipo] || "NOVEDAD_ABIERTA";
  let instaladorResponsable = null;
  if (esCoordinador) {
    if (!mongoose.Types.ObjectId.isValid(data.instaladorId)) throw new Error("Seleccione el instalador responsable del material");
    instaladorResponsable = await User.findOne({ _id: data.instaladorId, rol: "INSTALADOR" }).select("nombre").lean();
    if (!instaladorResponsable) throw new Error("El instalador seleccionado no esta disponible");
    const asignado = (asesoria.coordinacion?.asignaciones || []).some((item) => String(item.instaladorId) === String(instaladorResponsable._id));
    if (!asignado) throw new Error("El instalador seleccionado no esta asignado a esta orden");
    if (!(data.serviciosAfectados || []).length) throw new Error("Seleccione el servicio que necesita el nuevo corte");
  }
  const novedad = {
    tipo,
    descripcion,
    responsableCosto: esCoordinador ? "INSTALADOR" : responsableCosto,
    afectaMaterial: esCoordinador ? true : Boolean(data.afectaMaterial),
    afectaPrecio: Boolean(data.afectaPrecio),
    valorImpacto,
    serviciosAfectados: (data.serviciosAfectados || []).map(mayusculas).filter(Boolean),
    instaladorId: instaladorResponsable?._id || null,
    instaladorNombre: mayusculas(instaladorResponsable?.nombre),
    estado: esAdministrador ? "APROBADA" : "PENDIENTE",
    usuarioId: user._id,
    usuarioNombre: mayusculas(user.nombre || user.rol),
    usuarioRol: user.rol,
    fecha: new Date(),
  };
  const set = {
    situacionActual: esAdministrador ? situacionActual : "NOVEDAD_ABIERTA",
  };
  let revertirStockCancelacion = async () => {};

  if (tipo === "CANCELACION_TOTAL" && esAdministrador) {
    revertirStockCancelacion = await conciliarStockAccesorios(asesoria.accesorios || [], [], { asesoriaId: asesoria._id, codigo: asesoria.codigo, user });
    set.estado = "CANCELADA";
    set["flujo.etapa"] = "CANCELADA";
    set["flujo.fechaFinalizacion"] = new Date();

    const venta = await Venta.findOne({ asesoriaId: asesoria._id });
    if (["PENDIENTE", "RECHAZADA"].includes(venta?.estado)) {
      venta.estado = "ANULADA";
      venta.auditoria.push({
        accion: "ANULACION_POR_NOVEDAD",
        descripcion: descripcion,
        usuarioId: user._id,
        usuarioNombre: mayusculas(user.nombre || user.rol),
        usuarioRol: user.rol,
      });
      await venta.save();
      await Corte.updateMany({ ventaId: venta._id }, { $set: { ventaEstado: "ANULADA" } });
      try {
        await cerrarAlertaVentaPendiente(venta._id);
      } catch (error) {
        console.error("No se pudo cerrar la alerta de la venta anulada:", error.message);
      }
    }
  }

  if (tipo === "CANCELACION_PARCIAL" && esAdministrador) {
    if (!novedad.serviciosAfectados.length) throw new Error("Seleccione los servicios que desea cancelar");
    const venta = await Venta.findOne({ asesoriaId: asesoria._id }).select("estado pagos").lean();
    if (venta) throw new Error("La orden ya tiene una venta. Ajuste o devuelva el pago antes de cancelar servicios");
    const cortes = await Corte.find({ asesoriaId: asesoria._id }).select("asesoriaLinea").lean();
    if (cortes.length) throw new Error("No puede cancelar parcialmente una orden que ya consumio material. Registre el ajuste y el material afectado como novedad");

    const seleccionados = new Set(novedad.serviciosAfectados);
    asesoria.polarizados = asesoria.polarizados.filter((_, index) => !seleccionados.has(`POLARIZADO ${index + 1}`));
    asesoria.ppf = asesoria.ppf.filter((_, index) => !seleccionados.has(`PPF ${index + 1}`));
    asesoria.serviciosAdicionales = asesoria.serviciosAdicionales.filter((_, index) => !seleccionados.has(`ADICIONAL ${index + 1}`));
    const accesoriosRetirados = asesoria.accesorios.filter((_, index) => seleccionados.has(`ACCESORIO ${index + 1}`));
    asesoria.accesorios = asesoria.accesorios.filter((_, index) => !seleccionados.has(`ACCESORIO ${index + 1}`));
    if (!asesoria.polarizados.length && !asesoria.ppf.length && !asesoria.serviciosAdicionales.length && !asesoria.accesorios.length) {
      throw new Error("Para retirar todos los servicios use cancelacion total");
    }
    const revertirAccesorios = await conciliarStockAccesorios(accesoriosRetirados, [], { asesoriaId: asesoria._id, codigo: asesoria.codigo, user });
    asesoria.coordinacion.propuesta = [];
    asesoria.coordinacion.asignaciones = [];
    asesoria.coordinacion.estadoPropuesta = "PENDIENTE";
    asesoria.flujo.etapa = "PENDIENTE_COORDINACION";
    Object.assign(asesoria.comercial, recalcularComercial(asesoria));
    asesoria.situacionActual = "NORMAL";
    asesoria.novedades.push(novedad);
    asesoria.auditoria.push({
      accion: tipo,
      descripcion: `${descripcion}. Servicios retirados: ${novedad.serviciosAfectados.join(", ")}`,
      usuarioId: user._id,
      usuarioNombre: mayusculas(user.nombre || user.rol),
      fecha: new Date(),
    });
    try { await asesoria.save(); } catch (error) { await revertirAccesorios(); throw error; }
    try {
      await sincronizarAlertasAccesorios(asesoria);
      await crearAlertaServicioAsesor(asesoria);
    } catch (error) {
      console.error("No se pudo notificar la cancelacion parcial:", error.message);
    }
    return asesoria;
  }

  let actualizada;
  try { actualizada = await Asesoria.findByIdAndUpdate(
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
  ); } catch (error) { await revertirStockCancelacion(); throw error; }

  if (esInventario || esCoordinador) {
    const novedadGuardada = actualizada.novedades.at(-1);
    try {
      await crearAlertaSolicitudNovedad(actualizada, novedadGuardada);
    } catch (error) {
      console.error("No se pudo crear la alerta de novedad:", error.message);
    }
  }

  if (tipo === "CANCELACION_TOTAL" && esAdministrador) {
    try { await sincronizarAlertasAccesorios(actualizada); } catch (error) { console.error("No se pudo cerrar la alerta de accesorios:", error.message); }
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

export const resolverNovedadAsesoria = async (id, novedadId, data, user) => {
  if (!["ADMIN", "SUPERUSUARIO"].includes(user.rol)) throw new Error("Solo administracion puede resolver novedades");
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(novedadId)) throw new Error("Novedad no valida");
  const asesoria = await Asesoria.findById(id);
  if (!asesoria) throw new Error("Servicio no encontrado");
  const novedad = asesoria.novedades.id(novedadId);
  if (!novedad) throw new Error("Novedad no encontrada");
  if (novedad.estado !== "APROBADA") throw new Error("Solo puede resolver una novedad aprobada");
  const observacion = mayusculas(data.observacion);
  if (observacion.length < 5) throw new Error("Indique como se resolvio la novedad");
  novedad.estado = "RESUELTA";
  novedad.observacionRevision = [novedad.observacionRevision, `SOLUCION: ${observacion}`].filter(Boolean).join(" | ");
  novedad.fechaResolucion = new Date();
  novedad.resueltoPorNombre = mayusculas(user.nombre || user.rol);
  try {
    validarSinNovedadesBloqueantes(asesoria);
    asesoria.situacionActual = "NORMAL";
  } catch {
    asesoria.situacionActual = "NOVEDAD_ABIERTA";
  }
  asesoria.auditoria.push({ accion: "NOVEDAD_RESUELTA", descripcion: observacion, usuarioId: user._id, usuarioNombre: mayusculas(user.nombre || user.rol), fecha: new Date() });
  await asesoria.save();
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
  if (responsable === "INSTALADOR" && !data.instaladorId && !asesoria.garantia.instaladorId && !texto(data.instalador || asesoria.garantia.instalador)) {
    throw new Error("Seleccione el instalador responsable");
  }
  let instaladorGarantia = null;
  if (decision === "APROBAR" && responsable === "INSTALADOR") {
    const instaladorId = data.instaladorId || asesoria.garantia.instaladorId;
    if (!mongoose.Types.ObjectId.isValid(instaladorId)) throw new Error("Seleccione el instalador responsable");
    instaladorGarantia = await User.findOne({ _id: instaladorId, rol: "INSTALADOR", suspendido: { $ne: true } }).select("nombre").lean();
    if (!instaladorGarantia) throw new Error("El instalador seleccionado no esta disponible");
  }
  if (decision === "RECHAZAR" && texto(data.observacion).length < 5) {
    throw new Error("Indique el motivo del rechazo");
  }
  const revertirStockGarantia = decision === "RECHAZAR"
    ? await conciliarStockAccesorios(asesoria.accesorios || [], [], { asesoriaId: asesoria._id, codigo: asesoria.codigo, user })
    : async () => {};

  asesoria.garantia.estado = decision === "APROBAR" ? "APROBADA" : "RECHAZADA";
  asesoria.garantia.responsable = decision === "APROBAR" ? responsable : "CLIENTE";
  if (decision === "APROBAR") {
    asesoria.garantia.tipo = responsable === "CLIENTE" ? "GARANTIA" : `GARANTIA_${responsable}`;
  }
  asesoria.garantia.instalador = responsable === "INSTALADOR"
    ? mayusculas(instaladorGarantia?.nombre || data.instalador || asesoria.garantia.instalador)
    : asesoria.garantia.instalador;
  asesoria.garantia.instaladorId = responsable === "INSTALADOR" ? instaladorGarantia?._id : null;
  asesoria.garantia.observacionRevision = mayusculas(data.observacion);
  asesoria.garantia.revisadoPorId = user._id;
  asesoria.garantia.revisadoPorNombre = mayusculas(user.nombre || user.rol);
  asesoria.garantia.fechaRevision = new Date();
  asesoria.flujo.etapa = decision === "APROBAR" ? "PENDIENTE_COORDINACION" : "CANCELADA";
  asesoria.flujo.fechaEnvioInventario = null;
  if (decision === "RECHAZAR") asesoria.estado = "CANCELADA";
  asesoria.auditoria.push({
    accion: `GARANTIA_${asesoria.garantia.estado}`,
    descripcion: asesoria.garantia.observacionRevision || `Responsable: ${responsable}`,
    usuarioId: user._id,
    usuarioNombre: mayusculas(user.nombre || user.rol),
    fecha: new Date(),
  });
  try { await asesoria.save(); } catch (error) { await revertirStockGarantia(); throw error; }

  try {
    await cerrarAlertaSolicitudGarantia(asesoria._id);
    await sincronizarAlertasAccesorios(asesoria);
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
  validarSinNovedadesBloqueantes(asesoria);
  const accesoriosPendientes = (asesoria.accesorios || []).filter((item) => Number(item.cantidadPendiente || 0) > 0);
  if (accesoriosPendientes.length) {
    const detalle = accesoriosPendientes.map((item) => `${item.nombre}: faltan ${item.cantidadPendiente}`).join(", ");
    throw new Error(`No se puede finalizar. Faltan accesorios por recibir: ${detalle}`);
  }
  if (asesoria.coordinacion?.propuesta?.length || asesoria.coordinacion?.asignaciones?.length) {
    throw new Error("La orden debe terminar primero el flujo de coordinacion e instalacion");
  }
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
