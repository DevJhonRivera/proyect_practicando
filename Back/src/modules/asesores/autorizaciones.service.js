import { configurarCorreoBrevo, enviarCorreoBrevo } from "../../utils/correoBrevo.js";
import FotoDiagnostico from "./fotoDiagnostico.model.js";
import Alerta from "../alertas/alerta.model.js";
import { notificarUsuarios } from "../tiempoReal/canales.js";
import { validarRespuestaCliente } from "./respuestaCliente.utils.js";
import { validarCantidadFotos, validarImagen, validarFotosUnicas } from "./fotosDiagnostico.utils.js";
import { crearCorreoDocumento } from "./correoDocumento.utils.js";
import { crearAlertaServicioAsesor, crearAlertaSolicitudGarantia } from "../alertas/alerta.service.js";
import mongoose from "mongoose";
import Asesoria from "./asesoria.model.js";
import { coincideHuellaDocumento, condicionesDocumento, datosDocumento, firmaVigente, hash, huellaDatos, nuevoToken, TIPOS_DOCUMENTO, validarFirma, validarFirmasTrabajo } from "./autorizaciones.utils.js";

const assertId = (id) => { if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Servicio no valido"); };
const comprobarAcceso = (orden, user) => {
  if (!["ADMIN", "SUPERUSUARIO", "COORDINADOR"].includes(user.rol) && String(orden.creadoPor) !== String(user._id)) throw new Error("No tiene acceso a este servicio");
};
export const urlFirmaDocumento = (token) => {
  if (!process.env.FRONTEND_PUBLIC_URL) throw new Error("Configure FRONTEND_PUBLIC_URL para los enlaces de firma");
  const base = new URL(process.env.FRONTEND_PUBLIC_URL);
  if (!['http:', 'https:'].includes(base.protocol) || (process.env.NODE_ENV === "production" && base.protocol !== "https:")) throw new Error("Configure una URL publica HTTPS para las firmas");
  const url = new URL("/firmar", base);
  url.hash = token;
  return url.href;
};
export const enviarCorreoDocumento = async ({ correo, codigo, tipo, token, contenido, fotos = [] }) => {
  return enviarCorreoBrevo({ correo, ...crearCorreoDocumento({ tipo, codigo, url: urlFirmaDocumento(token), contenido, fotos }) });
};

export const emitirDocumento = async (id, tipo, user, { token = nuevoToken(), enviar = enviarCorreoDocumento } = {}) => {
  assertId(id);
  if (!TIPOS_DOCUMENTO.includes(tipo)) throw new Error("Tipo de documento no valido");
  const orden = await Asesoria.findById(id).select("+autorizaciones.documentos.tokenHash");
  if (!orden) throw new Error("Servicio no encontrado");
  comprobarAcceso(orden, user);
  if (orden.estado === "CANCELADA") throw new Error("El servicio esta cancelado");
  if (orden.autorizaciones.bloqueoCliente) throw new Error("Primero registre la gestion de la respuesta del cliente");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orden.cliente.correo)) throw new Error("Registre un correo valido del cliente");
  if (firmaVigente(orden, tipo)) throw new Error("Este documento ya tiene firma vigente");
  if (tipo === "DIAGNOSTICO" && !firmaVigente(orden, "COTIZACION")) throw new Error("Primero debe firmarse la cotizacion");
  if (tipo === "ENTREGA") {
    validarFirmasTrabajo(orden);
    if (orden.flujo.etapa !== "PENDIENTE_PAGO") throw new Error("El trabajo debe estar terminado antes de firmar la entrega");
    const ultimaEntrega = orden.autorizaciones.documentos.findLast((d) => d.tipo === "ENTREGA");
    const calidad = orden.coordinacion?.calidad;
    const avisoEnProceso = orden.autorizaciones.requeridas && calidad?.estado === "APROBADA"
      && ["PENDIENTE", "ENVIANDO"].includes(calidad.aviso?.estado);
    if (enviar === enviarCorreoDocumento && (avisoEnProceso
      || (ultimaEntrega?.estado === "PENDIENTE" && ultimaEntrega.envio === "ENVIADO" && ultimaEntrega.expira > new Date() && coincideHuellaDocumento(orden, ultimaEntrega)))) {
      throw new Error("El enlace de entrega ya fue enviado o el aviso está en proceso");
    }
  } else if (!["PENDIENTE_FIRMA_COTIZACION", "PENDIENTE_FIRMA_DIAGNOSTICO", "PENDIENTE_COORDINACION", "PENDIENTE_GARANTIA"].includes(orden.flujo.etapa)) {
    throw new Error("No se pueden reemplazar autorizaciones de un trabajo que ya avanzo. Registre la novedad correspondiente");
  }
  const previo = orden.autorizaciones.documentos.findLast((d) => d.tipo === tipo);
  if (previo?.tokenHash === hash(token) && previo.expira <= new Date()) throw new Error("El enlace anterior venció. Solicite una nueva acta al asesor.");
  const reutilizar = previo?.estado === "PENDIENTE" && previo.tokenHash === hash(token) && coincideHuellaDocumento(orden, previo);
  if (!reutilizar && orden.autorizaciones.documentos.length >= 25) throw new Error("Limite de versiones alcanzado. Solicite revision administrativa");
  let condiciones = condicionesDocumento();
  const cotizacion = tipo !== "COTIZACION" ? firmaVigente(orden, "COTIZACION") : null;
  if (tipo === "DIAGNOSTICO") validarFotosUnicas(orden.recepcion?.fotos);
  const fotos = tipo === "DIAGNOSTICO" ? await cargarFotos(orden._id, orden.recepcion.fotos) : [];
  if (tipo !== "COTIZACION") {
    if (!cotizacion?.firma?.aceptaciones?.datos || !cotizacion.firma.aceptaciones.condiciones || !cotizacion.firma.aceptaciones.firmaElectronica) throw new Error("La cotización debe incluir las autorizaciones generales firmadas antes de continuar");
    condiciones = {
      version: condiciones.version, responsable: condiciones.responsable,
      referenciaCotizacion: { documentoId: String(cotizacion._id), huella: cotizacion.huella, fecha: cotizacion.firma.fecha },
      confirmacion: tipo === "DIAGNOSTICO" ? "La firma de este diagnóstico deja constancia de la revisión del estado de ingreso, las fotografías y las pertenencias relacionadas. Si detecta una diferencia, solicite su corrección al asesor antes de firmar. Se conservan las autorizaciones y condiciones aceptadas en la cotización de referencia, sin solicitar nuevamente su consentimiento general." : "La firma de esta acta confirma la recepción del vehículo en las condiciones descritas. Se mantienen como antecedente las autorizaciones otorgadas en la cotización, sin que esta constancia implique renuncia a garantías o derechos legales.",
    };
  }
  configurarCorreoBrevo();
  if (!process.env.FRONTEND_PUBLIC_URL) throw new Error("Configure FRONTEND_PUBLIC_URL para los enlaces de firma");
  const fecha = new Date();
  const contenido = reutilizar ? previo.contenido : JSON.stringify({ versionFormato: 2, tipo, emitidoEn: fecha.toISOString(), datos: datosDocumento(orden, tipo), condiciones, aceptacionesRequeridas: tipo === "COTIZACION" ? ["documento", "datos", "condiciones", "firmaElectronica"] : ["documento"] });
  if (Buffer.byteLength(contenido, "utf8") > 128 * 1024) throw new Error("El documento supera el tamano permitido");
  const documentoId = reutilizar ? previo._id : new mongoose.Types.ObjectId();
  if (!reutilizar) {
    for (const anterior of orden.autorizaciones.documentos) if (anterior.tipo === tipo && anterior.estado === "PENDIENTE") anterior.estado = "INVALIDADO";
    orden.autorizaciones.requeridas = true;
    orden.autorizaciones.documentos.push({ _id: documentoId, tipo, contenido, huella: hash(contenido), huellaDatos: huellaDatos(orden, tipo), tokenHash: hash(token),
      creadoEn: fecha, expira: new Date(fecha.getTime() + 7 * 86400000), estado: "PENDIENTE", envio: "PENDIENTE" });
    if (tipo !== "ENTREGA") orden.flujo.etapa = tipo === "COTIZACION" ? "PENDIENTE_FIRMA_COTIZACION" : "PENDIENTE_FIRMA_DIAGNOSTICO";
    orden.auditoria.push({ accion: "DOCUMENTO_EMITIDO", descripcion: `${tipo} ${documentoId}`, usuarioId: user._id, usuarioNombre: user.nombre || user.rol, fecha });
    await orden.save();
  }
  try {
    const proveedorId = await enviar({ correo: orden.cliente.correo, codigo: orden.codigo, tipo, token, contenido: JSON.parse(contenido), fotos });
    await Asesoria.updateOne({ _id: id, "autorizaciones.documentos._id": documentoId }, { $set: {
      "autorizaciones.documentos.$.envio": "ENVIADO", "autorizaciones.documentos.$.enviadoEn": new Date(), "autorizaciones.documentos.$.proveedorId": proveedorId,
    } });
  } catch (error) {
    await Asesoria.updateOne({ _id: id, "autorizaciones.documentos._id": documentoId }, { $set: { "autorizaciones.documentos.$.envio": "ERROR" } });
    throw error;
  }
  return { documentoId, tipo, enviado: true, correo: orden.cliente.correo };
};

const buscarPorToken = async (token) => {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new Error("Enlace no valido o vencido");
  const orden = await Asesoria.findOne({ "autorizaciones.documentos.tokenHash": hash(token) }).select("+autorizaciones.documentos.tokenHash +autorizaciones.documentos.firma.evidenciaEntrega");
  const documento = orden?.autorizaciones.documentos.find((d) => d.tokenHash === hash(token));
  if (!documento || documento.estado === "INVALIDADO" || documento.expira <= new Date()) throw new Error("Enlace no valido o vencido. Solicite uno nuevo al asesor");
  if (documento.estado === "PENDIENTE") {
    if (orden.estado === "CANCELADA" || orden.autorizaciones.bloqueoCliente) throw new Error("Este servicio esta bloqueado. Contacte al asesor");
    const ultimo = [...orden.autorizaciones.documentos].reverse().find((d) => d.tipo === documento.tipo);
    if (String(ultimo?._id) !== String(documento._id)) throw new Error("Este documento fue reemplazado. Abra el enlace mas reciente");
    if (!coincideHuellaDocumento(orden, documento)) throw new Error("El servicio cambio. Solicite al asesor un documento actualizado");
    if (documento.tipo !== "COTIZACION" && !firmaVigente(orden, "COTIZACION")) throw new Error("Falta la firma vigente de cotizacion");
  }
  return { orden, documento };
};
const vistaPublica = async (documento, ordenId) => ({
  fotos: await cargarFotos(ordenId, JSON.parse(documento.contenido).datos?.recepcion?.fotos || []), id: documento._id, tipo: documento.tipo, contenido: JSON.parse(documento.contenido), huella: documento.huella,
  expira: documento.expira, estado: documento.estado,
  respuestaCliente: documento.respuestaCliente?.fecha ? { accion: documento.respuestaCliente.accion, nombre: documento.respuestaCliente.nombre, motivo: documento.respuestaCliente.motivo, fecha: documento.respuestaCliente.fecha } : null,
  firma: documento.estado === "FIRMADO" ? {
    nombre: documento.firma.nombre, fecha: documento.firma.fecha, trazo: documento.firma.trazo,
    observacionEntrega: documento.firma.observacionEntrega, evidenciaEntrega: documento.firma.evidenciaEntrega,
  } : null });
export const consultarDocumento = async (token) => {
  const { orden, documento } = await buscarPorToken(token);
  return vistaPublica(documento, orden._id);
};
export const firmarDocumento = async (token, body, evidencia) => {
  const { orden, documento } = await buscarPorToken(token);
  if (documento.estado !== "PENDIENTE") throw new Error("Este documento ya tiene una respuesta y no puede aprobarse");
  if (body.huella !== documento.huella || hash(documento.contenido) !== documento.huella) throw new Error("El documento no coincide con el revisado");
  if (documento.tipo === "ENTREGA") validarFirmasTrabajo(orden);
  const contenidoFirmado = JSON.parse(documento.contenido);
  if (documento.tipo === "DIAGNOSTICO") {
    validarFotosUnicas(contenidoFirmado.datos?.recepcion?.fotos);
    await cargarFotos(orden._id, contenidoFirmado.datos.recepcion.fotos);
  }
  const referencia = contenidoFirmado.condiciones?.referenciaCotizacion;
  if (referencia) {
    const previa = firmaVigente(orden, "COTIZACION");
    if (!previa || String(previa._id) !== referencia.documentoId || previa.huella !== referencia.huella || !previa.firma?.aceptaciones?.datos) throw new Error("La autorización de la cotización cambió. Solicite un documento actualizado");
  }
  validarFirma(body, orden, documento);
  const reserva = {};
  if (documento.tipo === "ENTREGA") {
    const observacion = body.observacionEntrega ?? "";
    if (typeof observacion !== "string" || observacion.length > 2000) throw new Error("La observación de entrega admite hasta 2000 caracteres");
    if (observacion.trim()) reserva.observacionEntrega = observacion.trim();
    if (body.evidenciaEntrega) reserva.evidenciaEntrega = validarImagen(body.evidenciaEntrega).dataUrl;
  }
  const fecha = new Date();
  const firma = { nombre: body.nombre.trim(), cedula: orden.cliente.cedula, fecha, trazo: body.trazo, ...reserva,
    aceptaciones: Object.fromEntries((contenidoFirmado.aceptacionesRequeridas || ["documento", "datos", "condiciones", "firmaElectronica"]).map((key) => [key, body.aceptaciones[key] === true])),
    ...(referencia ? { autorizacionPreviaId: referencia.documentoId } : {}),
    ip: String(evidencia.ip || "").slice(0, 100), agente: String(evidencia.agente || "").slice(0, 500) };
  const cambios = { "autorizaciones.documentos.$.estado": "FIRMADO", "autorizaciones.documentos.$.firma": firma };
  if (documento.tipo === "COTIZACION") cambios["flujo.etapa"] = "PENDIENTE_FIRMA_DIAGNOSTICO";
  if (documento.tipo === "DIAGNOSTICO") {
    cambios["flujo.etapa"] = orden.garantia?.esGarantia && orden.garantia.estado !== "APROBADA" ? "PENDIENTE_GARANTIA" : "PENDIENTE_COORDINACION";
    cambios.estado = "APROBADA";
    if (orden.situacionActual === "PENDIENTE_CLIENTE") cambios.situacionActual = "NORMAL";
  }
  if (documento.tipo === "ENTREGA" && orden.garantia?.esGarantia && Number(orden.comercial?.totalAcordado || 0) === 0) {
    cambios["flujo.etapa"] = "FINALIZADA";
    cambios["flujo.fechaFinalizacion"] = fecha;
    cambios["garantia.estado"] = "FINALIZADA";
  }
  const resultado = await Asesoria.findOneAndUpdate({ _id: orden._id, updatedAt: orden.updatedAt, __v: orden.__v ?? { $exists: false },
    "autorizaciones.documentos": { $elemMatch: { _id: documento._id, estado: "PENDIENTE", tokenHash: hash(token), expira: { $gt: fecha } } } }, {
    $set: cambios, $push: { auditoria: { accion: "FIRMA_CLIENTE", descripcion: `${documento.tipo} - huella ${documento.huella}`, usuarioNombre: firma.nombre, fecha } },
  }, { new: true, runValidators: true });
  if (!resultado) throw new Error("El servicio cambio o el documento ya fue firmado. Recargue la pagina");
  if (resultado.creadoPor) {
    notificarUsuarios([resultado.creadoPor], "firma-cliente", { asesoriaId: String(resultado._id) });
    const etiquetas = {
      COTIZACION: resultado.garantia?.esGarantia ? "la solicitud de garantía" : "la cotización",
      DIAGNOSTICO: "el diagnóstico de ingreso",
      ENTREGA: "el acta de entrega del vehículo",
    };
    try {
      await Alerta.findOneAndUpdate({ clave: `firma-cliente:${documento._id}` }, {
        $setOnInsert: {
          tipo: "FIRMA_CLIENTE",
          mensaje: `${resultado.codigo} · ${resultado.vehiculo.placa}: el cliente firmó ${etiquetas[documento.tipo]}${reserva.observacionEntrega || reserva.evidenciaEntrega ? " con observaciones o evidencia. Revisa el acta de entrega" : ""}.`,
          referenciaId: resultado._id,
          destinatarioId: resultado.creadoPor,
          accionUrl: `/asesores?asesoria=${resultado._id}`,
        },
      }, { upsert: true, new: true, setDefaultsOnInsert: true });
    } catch (error) {
      console.error("No se pudo guardar la alerta de firma del cliente:", error.message);
    }
  }
  if (documento.tipo === "DIAGNOSTICO") {
    try {
      if (resultado.garantia?.esGarantia && resultado.garantia.estado !== "APROBADA") await crearAlertaSolicitudGarantia(resultado);
      else await crearAlertaServicioAsesor(resultado);
    } catch (error) { console.error("No se pudo notificar la autorizacion del servicio:", error.message); }
  }
  const recibo = await vistaPublica(resultado.autorizaciones.documentos.id(documento._id), resultado._id);
  Object.assign(recibo.firma, reserva);
  return recibo;
};

export const guardarDiagnostico = async (id, data, user) => {
  assertId(id);
  const orden = await Asesoria.findById(id);
  if (!orden) throw new Error("Servicio no encontrado");
  comprobarAcceso(orden, user);
  if (orden.estado === "CANCELADA" || orden.autorizaciones.bloqueoCliente) throw new Error("Registre primero la gestion de la respuesta del cliente");
  const cotizacion = firmaVigente(orden, "COTIZACION");
  if (!cotizacion) throw new Error("Primero debe firmarse la cotizacion");
  if (!cotizacion.firma?.aceptaciones?.datos) throw new Error("La cotización debe contar con la autorización de datos antes de registrar fotografías");
  if (orden.flujo.etapa !== "PENDIENTE_FIRMA_DIAGNOSTICO") throw new Error("El diagnostico solo se puede registrar en su etapa de autorizacion");
  const texto = (value) => typeof value === "string" ? value.trim().slice(0, 4000) : "";
  const r = data.recepcion || {};
  const recepcion = { tieneRayones: r.tieneRayones === true, detalleRayones: texto(r.detalleRayones), dejaObjetos: r.dejaObjetos === true, detalleObjetos: texto(r.detalleObjetos), observaciones: texto(r.observaciones) };
  if (recepcion.tieneRayones && !recepcion.detalleRayones) throw new Error("Describa los rayones del vehiculo");
  if (recepcion.dejaObjetos && !recepcion.detalleObjetos) throw new Error("Relacione los objetos que quedan dentro del vehiculo");
  if (!["SI", "NO", "SIN_CONFIRMAR"].includes(data.seguroEstado)) throw new Error("Indique el estado del seguro");
  validarCantidadFotos(data.fotos);
  const fotos = [];
  for (const [i, entrada] of data.fotos.entries()) {
    let foto;
    if (entrada.fotoId) {
      if (!mongoose.Types.ObjectId.isValid(entrada.fotoId)) throw new Error("Referencia de foto no válida");
      foto = await FotoDiagnostico.findOne({ _id: entrada.fotoId, asesoriaId: orden._id });
      if (!foto) throw new Error("La foto no pertenece a este vehículo");
    } else {
      const imagen = validarImagen(entrada.dataUrl);
      foto = await FotoDiagnostico.findOneAndUpdate({ asesoriaId: orden._id, sha256: imagen.sha256 }, { $setOnInsert: { ...imagen, creadoPor: user._id } }, { upsert: true, new: true, runValidators: true });
    }
    fotos.push({ fotoId: String(foto._id), sha256: foto.sha256, nombre: typeof entrada.nombre === "string" ? entrada.nombre.trim().slice(0, 100) : `Vista ${i + 1}` });
  }
  validarFotosUnicas(fotos);
  recepcion.fotos = fotos;
  orden.recepcion = recepcion;
  orden.seguroVehiculo.estado = data.seguroEstado;
  orden.auditoria.push({ accion: "DIAGNOSTICO_REGISTRADO", descripcion: `Estado de ingreso y pertenencias actualizados con ${fotos.length} fotografías antes de firma`, usuarioId: user._id, usuarioNombre: user.nombre || user.rol, fecha: new Date() });
  await orden.save();
  return { guardado: true };
};

const cargarFotos = async (ordenId, referencias = []) => {
  if (!referencias.length) return [];
  const fotos = await FotoDiagnostico.find({ asesoriaId: ordenId, _id: { $in: referencias.map((f) => f.fotoId) } }).select("+dataUrl").lean();
  return referencias.map((ref) => {
    const foto = fotos.find((f) => String(f._id) === String(ref.fotoId) && f.sha256 === ref.sha256);
    if (!foto) throw new Error("No se pudo recuperar una foto del diagnóstico. Solicite revisión al asesor");
    return { fotoId: String(foto._id), sha256: foto.sha256, nombre: ref.nombre, dataUrl: foto.dataUrl };
  });
};
export const consultarFotosServicio = async (id, documentoId, user) => {
  assertId(id);
  const orden = await Asesoria.findById(id);
  if (!orden) throw new Error("Servicio no encontrado");
  comprobarAcceso(orden, user);
  const documento = documentoId ? orden.autorizaciones.documentos.id(documentoId) : null;
  if (documentoId && !documento) throw new Error("Documento no encontrado");
  const referencias = documento ? JSON.parse(documento.contenido).datos?.recepcion?.fotos || [] : orden.recepcion?.fotos || [];
  return cargarFotos(orden._id, referencias);
};

export const responderDocumento = async (token, body, evidencia = {}) => {
  const { orden, documento } = await buscarPorToken(token);
  validarRespuestaCliente(body, orden, documento);
  const fecha = new Date();
  const respuesta = { accion: body.accion, nombre: body.nombre.trim(), cedula: orden.cliente.cedula,
    motivo: body.motivo.trim(), fecha, ip: String(evidencia.ip || "").slice(0, 100), agente: String(evidencia.agente || "").slice(0, 500) };
  const estado = body.accion === "RECHAZAR" ? "RECHAZADO" : "CORRECCION_SOLICITADA";
  const resultado = await Asesoria.findOneAndUpdate({ _id: orden._id, updatedAt: orden.updatedAt,
    "autorizaciones.documentos": { $elemMatch: { _id: documento._id, estado: "PENDIENTE", tokenHash: hash(token), expira: { $gt: fecha } } } }, {
    $set: { "autorizaciones.documentos.$.estado": estado, "autorizaciones.documentos.$.respuestaCliente": respuesta,
      "autorizaciones.bloqueoCliente": true, situacionActual: "PENDIENTE_CLIENTE" },
    $push: { auditoria: { accion: estado, descripcion: `${documento.tipo}: ${respuesta.motivo}`, usuarioNombre: respuesta.nombre, fecha } },
  }, { new: true, runValidators: true });
  if (!resultado) throw new Error("El servicio cambio o ya tiene respuesta. Recargue la pagina");
  try {
    await Alerta.findOneAndUpdate({ clave: `respuesta-cliente:${documento._id}` }, {
      tipo: "RESPUESTA_CLIENTE", mensaje: `${orden.codigo}: ${estado.replaceAll("_", " ")} en ${documento.tipo}. Revise el motivo y gestione la solicitud.`,
      referenciaId: orden._id, destinatarioId: orden.creadoPor, accionUrl: `/asesores?asesoria=${orden._id}`, activa: true, atendida: false,
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
  } catch (error) { console.error("No se pudo notificar la respuesta del cliente:", error.message); }
  return vistaPublica(resultado.autorizaciones.documentos.id(documento._id), resultado._id);
};

export const gestionarRespuestaCliente = async (id, body, user) => {
  assertId(id);
  const orden = await Asesoria.findById(id);
  if (!orden) throw new Error("Servicio no encontrado");
  comprobarAcceso(orden, user);
  if (orden.estado === "CANCELADA" || !orden.autorizaciones.bloqueoCliente) throw new Error("No hay una respuesta pendiente de gestion");
  const documento = [...orden.autorizaciones.documentos].reverse().find((d) => ["RECHAZADO", "CORRECCION_SOLICITADA"].includes(d.estado) && !d.gestionRespuesta?.fecha);
  if (!documento) throw new Error("Respuesta no encontrada");
  if (!["PREPARAR_REVISION", "CERRAR"].includes(body.accion)) throw new Error("Gestion no valida");
  if (typeof body.nota !== "string" || body.nota.trim().length < 5 || body.nota.length > 2000) throw new Error("Describa la gestion (entre 5 y 2000 caracteres)");
  const gestion = { accion: body.accion, nota: body.nota.trim(), usuarioId: user._id, usuarioNombre: user.nombre || user.rol, fecha: new Date() };
  if (body.accion === "CERRAR") {
    if (!["ADMIN", "SUPERUSUARIO"].includes(user.rol)) throw new Error("El cierre debe realizarlo un administrador");
    if (!["NO_RECIBIDO", "DEVUELTO"].includes(body.estadoVehiculo)) throw new Error("Confirme si el vehiculo no fue recibido o ya fue devuelto");
    const { registrarNovedadAsesoria } = await import("./asesor.service.js");
    await registrarNovedadAsesoria(id, { tipo: "CANCELACION_TOTAL", descripcion: `Respuesta del cliente: ${documento.respuestaCliente.motivo}. Vehiculo: ${body.estadoVehiculo}. ${body.nota}`, responsableCosto: "NO_APLICA", valorImpacto: 0 }, user);
    // Reuse cancellation's stock reconciliation and payment safeguards.
    const cerrada = await Asesoria.findById(id);
    cerrada.autorizaciones.documentos.id(documento._id).gestionRespuesta = { ...gestion, nota: `${body.estadoVehiculo}: ${gestion.nota}` };
    cerrada.autorizaciones.bloqueoCliente = false;
    await cerrada.save();
  } else {
    documento.gestionRespuesta = gestion;
    orden.autorizaciones.bloqueoCliente = false;
    orden.flujo.etapa = documento.tipo === "COTIZACION" ? "PENDIENTE_FIRMA_COTIZACION" : "PENDIENTE_FIRMA_DIAGNOSTICO";
    for (const d of orden.autorizaciones.documentos) if (d.estado === "PENDIENTE") d.estado = "INVALIDADO";
    orden.auditoria.push({ accion: "REVISION_CLIENTE", descripcion: `${documento.tipo}: ${gestion.nota}`, usuarioId: user._id, usuarioNombre: gestion.usuarioNombre, fecha: gestion.fecha });
    await orden.save();
  }
  try { await Alerta.updateMany({ clave: `respuesta-cliente:${documento._id}` }, { $set: { activa: false, atendida: true } }); }
  catch (error) { console.error("No se pudo cerrar la alerta de respuesta:", error.message); }
  return { gestionada: true };
};
