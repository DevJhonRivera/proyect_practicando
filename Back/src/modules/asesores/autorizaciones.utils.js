import { obtenerPoliticaDatos } from "../privacidad/politicaDatos.js";
import { createHash, randomBytes } from "node:crypto";

export const TIPOS_DOCUMENTO = ["COTIZACION", "DIAGNOSTICO", "ENTREGA"];
export const hash = (texto) => createHash("sha256").update(texto).digest("hex");
export const nuevoToken = () => randomBytes(32).toString("hex");
const limpiar = (valor) => {
  if (Array.isArray(valor)) return valor.map(limpiar);
  if (valor && typeof valor === "object") return Object.fromEntries(Object.entries(valor).filter(([k]) => !["_id", "cantidadDescontada", "cantidadPendiente", "estadoInventario", "costoUnitario"].includes(k)).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, limpiar(v)]));
  return valor;
};
export const datosDocumento = (orden, tipo, incluirGarantia = true) => {
  const o = orden.toObject ? orden.toObject() : orden;
  const datos = { codigo: o.codigo, cliente: o.cliente, vehiculo: o.vehiculo,
    polarizados: o.polarizados || [], ppf: o.ppf || [], serviciosAdicionales: o.serviciosAdicionales || [],
    accesorios: o.accesorios || [], comercial: o.comercial };
  if (incluirGarantia && o.garantia?.esGarantia) datos.garantia = {
    esGarantia: true, motivo: o.garantia.motivo || "",
    codigoOrdenOrigen: o.garantia.codigoOrdenOrigen || "",
    fechaOrdenOrigen: o.garantia.fechaOrdenOrigen ? new Date(o.garantia.fechaOrdenOrigen).toISOString() : null,
    ordenOrigenId: o.garantia.ordenOrigenId ? String(o.garantia.ordenOrigenId) : null,
  };
  if (tipo !== "COTIZACION") Object.assign(datos, { recepcion: o.recepcion, seguroVehiculo: { estado: o.seguroVehiculo?.estado || "SIN_CONFIRMAR" } });
  // Empty new fields must not invalidate signatures issued before photos existed.
  if (datos.recepcion && !datos.recepcion.fotos?.length) {
    datos.recepcion = { ...datos.recepcion }; delete datos.recepcion.fotos;
  }
  return limpiar(datos);
};
export const huellaDatos = (orden, tipo, incluirGarantia = true) => hash(JSON.stringify(datosDocumento(orden, tipo, incluirGarantia)));
// Documents already issued keep their original snapshot and fingerprint format.
export const coincideHuellaDocumento = (orden, documento) => {
  let incluirGarantia = true;
  if (documento.contenido) {
    const contenido = JSON.parse(documento.contenido);
    incluirGarantia = contenido.versionFormato >= 2 || !!contenido.datos?.garantia;
  }
  if (documento.huellaDatos === huellaDatos(orden, documento.tipo, incluirGarantia)) return true;
  // Caja can correct the billing address after delivery without modifying the signed snapshot.
  if (documento.estado !== "FIRMADO" || !orden.correoActualizadoEnCaja || orden.correoActualizadoEnCaja !== orden.cliente?.correo || !documento.contenido) return false;
  const clienteOriginal = JSON.parse(documento.contenido).datos?.cliente;
  if (!clienteOriginal) return false;
  const datos = datosDocumento(orden, documento.tipo, incluirGarantia);
  datos.cliente.correo = clienteOriginal.correo;
  return documento.huellaDatos === hash(JSON.stringify(limpiar(datos)));
};
export const firmaVigente = (orden, tipo) => {
  const ultimo = [...(orden.autorizaciones?.documentos || [])].reverse().find((d) => d.tipo === tipo);
  return ultimo?.estado === "FIRMADO" && coincideHuellaDocumento(orden, ultimo) ? ultimo : undefined;
};
export const validarFirmasTrabajo = (orden) => {
  if (orden.autorizaciones?.bloqueoCliente) throw new Error("El cliente rechazo el documento o solicito correcciones. Resuelva su respuesta antes de continuar");
  if (!orden.autorizaciones?.requeridas) return;
  for (const tipo of ["COTIZACION", "DIAGNOSTICO"]) {
    if (!firmaVigente(orden, tipo)) throw new Error(`El cliente debe firmar ${tipo.toLowerCase()} vigente antes de continuar`);
  }
};
export const validarFirmaEntrega = (orden) => {
  validarFirmasTrabajo(orden);
  if (orden.autorizaciones?.requeridas && !firmaVigente(orden, "ENTREGA")) throw new Error("El cliente debe firmar la recepcion del vehiculo antes de caja");
};
export const validarFirma = (body, orden, documento = null) => {
  if (documento?.tipo === "COTIZACION") {
    if (body.aceptaciones?.identidad !== true) throw new Error("Confirme que su nombre y número de cédula son correctos");
  } else {
    if (typeof body.nombre !== "string" || body.nombre.trim().length < 3 || body.nombre.length > 150) throw new Error("Indique su nombre completo");
    if (String(body.cedula || "").replace(/\D/g, "") !== orden.cliente.cedula) throw new Error("El documento no coincide con el titular del servicio");
  }
  const requeridas = documento ? JSON.parse(documento.contenido).aceptacionesRequeridas : null;
  for (const campo of requeridas || ["documento", "datos", "condiciones", "firmaElectronica"]) {
    if (body.aceptaciones?.[campo] !== true) throw new Error("Debe aceptar expresamente cada autorizacion");
  }
  const puntos = body.trazo;
  if (!Array.isArray(puntos) || puntos.length < 10 || puntos.length > 5000 || puntos.some((p) => !Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite) || p[0] < 0 || p[0] > 1 || p[1] < 0 || p[1] > 1 || ![0, 1].includes(p[2]))) throw new Error("Dibuje su firma en el recuadro");
  if (new Set(puntos.map((p) => `${p[0]},${p[1]}`)).size < 10) throw new Error("La firma debe contener un trazo");
};
export const condicionesDocumento = () => {
  const requeridos = ["LEGAL_COMPANY_NAME", "LEGAL_COMPANY_ID", "LEGAL_ADDRESS", "LEGAL_PHONE", "PRIVACY_EMAIL", "PRIVACY_POLICY_URL"];
  const faltantes = requeridos.filter((key) => !process.env[key]?.trim());
  if (faltantes.length) throw new Error(`Configure los datos del responsable antes de emitir documentos: ${faltantes.join(", ")}`);
  const politica = new URL(process.env.PRIVACY_POLICY_URL);
  if (!["http:", "https:"].includes(politica.protocol)) throw new Error("URL de politica de datos no valida");
  return {
    version: "2026-11-04.1",
    politica: obtenerPoliticaDatos(),
    resumen: [
      { titulo: "Servicio acordado", texto: "Instalaremos los materiales y realizaremos los trabajos descritos, por el valor indicado en esta cotización." },
      { titulo: "Datos para atenderte", texto: "Usaremos tus datos, fotos del vehículo y evidencias de firma para gestionar este servicio, su entrega y garantías. No incluye publicidad. Puedes ejercer tus derechos en el contacto del responsable." },
      { titulo: "Estado y pertenencias", texto: "El diagnóstico documentará el vehículo y los objetos declarados. Retira tus objetos de valor y revisa ese registro antes de firmarlo." },
      { titulo: "Custodia y firma", texto: "Los incidentes se resuelven conforme a la ley, sin exonerar las responsabilidades de la empresa. Tu firma queda vinculada al documento que revisas." },
    ],
    responsable: `${process.env.LEGAL_COMPANY_NAME}, NIT ${process.env.LEGAL_COMPANY_ID}. Direccion: ${process.env.LEGAL_ADDRESS}. Telefono: ${process.env.LEGAL_PHONE}. Contacto de datos: ${process.env.PRIVACY_EMAIL}.`,
    politicaUrl: politica.href,
    datos: "Autorizo de manera previa, expresa e informada a la empresa identificada en este documento para recolectar, almacenar, consultar y utilizar mis datos de identificación y contacto, la información del vehículo, el registro fotográfico de su estado, el inventario de pertenencias y las evidencias de firma. El tratamiento se limita a elaborar la cotización, ejecutar y documentar el servicio, verificar su calidad, gestionar la entrega, la facturación y las garantías, y atender solicitudes relacionadas. Esta autorización no comprende publicidad ni reconocimiento biométrico de la firma. Puedo conocer, actualizar y rectificar mis datos, consultar gratuitamente la información, solicitar prueba de esta autorización, conocer su uso, presentar quejas ante la Superintendencia de Industria y Comercio y solicitar la revocatoria o supresión cuando legalmente proceda. Los datos se conservarán durante los plazos necesarios para estas finalidades y las obligaciones legales aplicables. Las consultas y reclamos se reciben en el contacto del responsable aquí indicado. La respuesta sobre datos sensibles es facultativa. La política de tratamiento está disponible en: " + politica.href,
    incidentes: "Durante la permanencia del vehículo en las instalaciones pueden presentarse incendios, catástrofes u otros incidentes. La empresa conserva las obligaciones de cuidado y las responsabilidades que legalmente le correspondan. Si ocurre un daño, su causa y las responsabilidades se determinarán conforme a la ley; un incendio u otro incidente no constituye, por sí solo, fuerza mayor o caso fortuito. La existencia o ausencia de seguro del vehículo no traslada automáticamente la responsabilidad al cliente, y cualquier cobertura dependerá de la póliza efectivamente contratada. La firma de este documento acredita la aceptación de estas condiciones, sin exonerar a la empresa de sus responsabilidades legales ni implicar renuncia de los derechos del consumidor.",
    pertenencias: "En el diagnóstico de ingreso se dejará constancia del estado del vehículo y del inventario de pertenencias, para su revisión y firma por separado. Se recomienda retirar dinero y objetos de valor. Los objetos que permanezcan deben quedar expresamente relacionados; su tratamiento y cualquier responsabilidad se resolveran conforme a la ley. No se pacta una exoneracion absoluta por perdida o dano.",
    firma: "Acepto utilizar este mecanismo de firma electronica: enlace personal enviado a mi correo, identificacion del titular, aceptaciones expresas y trazo manuscrito. Mi firma se vincula al contenido y huella del documento mostrado. No comparta este enlace.",
  };
};
