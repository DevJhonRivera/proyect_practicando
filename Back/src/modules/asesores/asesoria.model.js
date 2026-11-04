import mongoose from "mongoose";
import { validarFirmasTrabajo, validarFirmaEntrega } from "./autorizaciones.utils.js";
import { capturarEstado, registrarCambios } from "./trazabilidad.utils.js";

const asesoriaSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: true,
      unique: true,
    },
    cliente: {
      cedula: { type: String, required: true, trim: true },
      nombre: { type: String, required: true, trim: true },
      telefono: { type: String, default: "", trim: true },
      correo: { type: String, default: "", trim: true, lowercase: true },
    },
    correoActualizadoEnCaja: { type: String, default: "" },
    vehiculo: {
      placa: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        minlength: 5,
        maxlength: 10,
      },
      marca: { type: String, required: true, trim: true, uppercase: true },
      modelo: { type: String, required: true, trim: true, uppercase: true },
      anio: { type: String, default: "", trim: true },
      color: { type: String, default: "", trim: true, uppercase: true },
    },
    seguroVehiculo: {
      estado: { type: String, enum: ["SIN_CONFIRMAR", "SI", "NO"], default: "SIN_CONFIRMAR" },
      aseguradora: { type: String, default: "", trim: true },
      numeroPoliza: { type: String, default: "", trim: true },
      vigenciaHasta: { type: String, default: "" },
    },
    autorizaciones: {
      requeridas: { type: Boolean, default: false },
      bloqueoCliente: { type: Boolean, default: false },
      documentos: { type: [{
        tipo: { type: String, enum: ["COTIZACION", "DIAGNOSTICO", "ENTREGA"], required: true },
        contenido: { type: String, required: true },
        huella: { type: String, required: true },
        huellaDatos: { type: String, required: true },
        tokenHash: { type: String, required: true, select: false },
        expira: { type: Date, required: true },
        creadoEn: { type: Date, required: true },
        estado: { type: String, enum: ["PENDIENTE", "FIRMADO", "INVALIDADO", "RECHAZADO", "CORRECCION_SOLICITADA"], default: "PENDIENTE" },
        envio: { type: String, enum: ["PENDIENTE", "ENVIADO", "ERROR"], default: "PENDIENTE" },
        enviadoEn: Date,
        proveedorId: String,
        respuestaCliente: { accion: String, motivo: String, nombre: String, cedula: String, fecha: Date, ip: String, agente: String },
        gestionRespuesta: { accion: String, nota: String, usuarioId: mongoose.Schema.Types.ObjectId, usuarioNombre: String, fecha: Date },
        firma: {
          nombre: String, cedula: String, fecha: Date,
          trazo: { type: [[Number]], default: undefined },
          observacionEntrega: String,
          evidenciaEntrega: { type: String, select: false },
          ip: String, agente: String,
          aceptaciones: { identidad: Boolean, documento: Boolean, datos: Boolean, condiciones: Boolean, firmaElectronica: Boolean },
          autorizacionPreviaId: String,
        },
      }], default: [] },
    },
    trazabilidad: {
      type: [{
        proceso: { type: String, required: true },
        anterior: { type: String, default: "" },
        estado: { type: String, required: true },
        fecha: { type: Date, required: true },
        usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        usuarioNombre: { type: String, default: "" },
      }],
      default: [],
    },
    recepcion: {
      fotos: { type: [{ fotoId: { type: String, required: true }, sha256: { type: String, required: true }, nombre: { type: String, default: "" } }], default: [] },
      tieneRayones: { type: Boolean, default: false },
      detalleRayones: { type: String, default: "", trim: true },
      dejaObjetos: { type: Boolean, default: false },
      detalleObjetos: { type: String, default: "", trim: true },
      observaciones: { type: String, default: "", trim: true },
    },
    polarizados: {
      type: [{
        material: { type: String, required: true, trim: true, uppercase: true },
        porcentaje: { type: String, required: true, trim: true, uppercase: true },
        partes: { type: [String], default: [] },
        valor: { type: Number, required: true, min: 0 },
      }],
      default: [],
    },
    ppf: {
      type: [{
        referencia: { type: String, required: true, trim: true, uppercase: true },
        aplicacion: {
          type: String,
          enum: ["INTERIOR", "EXTERIOR", "COMPLETO", "PIEZAS"],
          default: "PIEZAS",
        },
        piezas: { type: [String], default: [] },
        valor: { type: Number, required: true, min: 0 },
      }],
      default: [],
    },
    serviciosAdicionales: {
      type: [{
        tipo: { type: String, required: true, trim: true, uppercase: true },
        detalle: { type: String, default: "", trim: true, uppercase: true },
        valor: { type: Number, required: true, min: 0 },
      }],
      default: [],
    },
    accesorios: {
      type: [{
        accesorioId: { type: mongoose.Schema.Types.ObjectId, ref: "Accesorio", required: true },
        codigo: { type: String, required: true, trim: true, uppercase: true },
        categoria: { type: String, required: true, trim: true, uppercase: true },
        nombre: { type: String, required: true, trim: true, uppercase: true },
        marca: { type: String, default: "GENERICO", trim: true, uppercase: true },
        referencia: { type: String, default: "", trim: true, uppercase: true },
        cantidad: { type: Number, required: true, min: 1 },
        cantidadDescontada: { type: Number, default: 0, min: 0 },
        cantidadPendiente: { type: Number, default: 0, min: 0 },
        estadoInventario: { type: String, enum: ["RESERVADO", "PENDIENTE_STOCK"], default: "RESERVADO" },
        costoUnitario: { type: Number, default: 0, min: 0 },
        precioUnitario: { type: Number, required: true, min: 0 },
        valor: { type: Number, required: true, min: 0 },
      }],
      default: [],
    },
    garantia: {
      esGarantia: { type: Boolean, default: false },
      tipo: { type: String, default: "", trim: true, uppercase: true },
      motivo: { type: String, default: "", trim: true, uppercase: true },
      instalador: { type: String, default: "", trim: true, uppercase: true },
      instaladorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      ordenOrigenId: { type: mongoose.Schema.Types.ObjectId, ref: "Asesoria", default: null },
      codigoOrdenOrigen: { type: String, default: "", trim: true, uppercase: true },
      fechaOrdenOrigen: { type: Date, default: null },
      costoMaterial: { type: Number, default: 0, min: 0 },
      estado: {
        type: String,
        enum: ["NO_APLICA", "PENDIENTE", "APROBADA", "RECHAZADA", "FINALIZADA"],
        default: "NO_APLICA",
      },
      responsable: {
        type: String,
        enum: ["POR_DEFINIR", "EMPRESA", "INSTALADOR", "PROVEEDOR", "CLIENTE"],
        default: "POR_DEFINIR",
      },
      observacionRevision: { type: String, default: "", trim: true, uppercase: true },
      revisadoPorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      revisadoPorNombre: { type: String, default: "" },
      fechaRevision: { type: Date, default: null },
    },
    comercial: {
      valorVenta: { type: Number, required: true, min: 0 },
      aplicaDescuento: { type: Boolean, default: false },
      descuento: { type: Number, default: 0, min: 0 },
      totalAcordado: { type: Number, required: true, min: 0 },
      metodoPagoPrevisto: {
        type: String,
        enum: [
          "POR_DEFINIR",
          "EFECTIVO",
          "TRANSFERENCIA",
          "TARJETA",
          "CREDITO",
          "MIXTO",
        ],
        default: "POR_DEFINIR",
      },
    },
    pago: {
      estado: {
        type: String,
        enum: ["NO_APLICA", "PENDIENTE", "PARCIAL", "PAGADO", "RECHAZADO"],
        default: "PENDIENTE",
      },
      valorRecibido: { type: Number, default: 0, min: 0 },
      recibidoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      recibidoPorNombre: { type: String, default: "" },
      fechaPago: { type: Date, default: null },
      metodoPagoFinal: { type: String, default: "" },
    },
    coordinacion: {
      calidad: {
        requerida: { type: Boolean, default: false },
        estado: { type: String, enum: ["SIN_REVISAR", "PENDIENTE", "REPROCESO", "APROBADA"], default: "SIN_REVISAR" },
        revisiones: { type: [{
          decision: { type: String, enum: ["APROBAR", "CORREGIR", "RECORTE"], required: true },
          observacion: String, fecha: Date, usuarioId: mongoose.Schema.Types.ObjectId, usuarioNombre: String,
          asignaciones: [{ asignacionId: mongoose.Schema.Types.ObjectId, servicio: String, descripcion: String, instaladorId: mongoose.Schema.Types.ObjectId, instaladorNombre: String, fechaInicio: Date, fechaFinalizacion: Date }],
          novedadId: mongoose.Schema.Types.ObjectId,
          materialRecibidoEn: Date, materialRecibidoPor: String,
        }], default: [] },
        aviso: {
          estado: { type: String, enum: ["PENDIENTE", "ENVIANDO", "ENVIADO", "ERROR"], default: "PENDIENTE" },
          intentoEn: Date, enviadoEn: Date, proveedorId: String, error: String,
        },
      },
      propuesta: {
        type: [{
          linea: { type: String, required: true, trim: true, uppercase: true },
          material: { type: String, default: "", trim: true, uppercase: true },
          partes: { type: [String], default: [] },
          anchoCm: { type: Number, default: 0, min: 0 },
          largoCm: { type: Number, default: 0, min: 0 },
          cantidad: { type: Number, default: 1, min: 1 },
          medidasPiezas: {
            type: [{
              pieza: { type: String, required: true, trim: true, uppercase: true },
              anchoCm: { type: Number, default: 0, min: 0 },
              largoCm: { type: Number, default: 0, min: 0 },
              cantidad: { type: Number, default: 1, min: 1 },
            }],
            default: [],
          },
          metrosPropuestos: { type: Number, required: true, min: 0.01 },
          observacion: { type: String, default: "", trim: true, uppercase: true },
        }],
        default: [],
      },
      asignaciones: {
        type: [{
          servicio: { type: String, required: true, trim: true, uppercase: true },
          descripcion: { type: String, default: "", trim: true, uppercase: true },
          instaladorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          instaladorNombre: { type: String, required: true, trim: true, uppercase: true },
          valorInstalacion: { type: Number, default: 0, min: 0 },
          estado: {
            type: String,
            enum: ["ESPERANDO_MATERIAL", "PENDIENTE", "EN_PROCESO", "COMPLETADA"],
            default: "ESPERANDO_MATERIAL",
          },
          fechaInicio: { type: Date, default: null },
          fechaFinalizacion: { type: Date, default: null },
          observacion: { type: String, default: "", trim: true, uppercase: true },
        }],
        default: [],
      },
      coordinadorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      coordinadorNombre: { type: String, default: "", trim: true, uppercase: true },
      estadoPropuesta: {
        type: String,
        enum: ["PENDIENTE", "EN_REVISION", "APROBADA", "RECHAZADA", "MATERIAL_LISTO"],
        default: "PENDIENTE",
      },
      observacionInventario: { type: String, default: "", trim: true, uppercase: true },
      revisadoPorNombre: { type: String, default: "", trim: true, uppercase: true },
      fechaPropuesta: { type: Date, default: null },
      fechaRevision: { type: Date, default: null },
      fechaMaterialListo: { type: Date, default: null },
    },
    flujo: {
      etapa: {
        type: String,
        enum: ["PENDIENTE_FIRMA_COTIZACION", "PENDIENTE_FIRMA_DIAGNOSTICO", "PENDIENTE_GARANTIA", "PENDIENTE_COORDINACION", "PENDIENTE_APROBACION_CORTE", "PENDIENTE_INVENTARIO", "EN_PROCESO", "MATERIAL_LISTO", "EN_INSTALACION", "PENDIENTE_CALIDAD", "REPROCESO", "PENDIENTE_PAGO", "FINALIZADA", "CANCELADA"],
        default: "PENDIENTE_INVENTARIO",
      },
      fechaEnvioInventario: { type: Date, default: Date.now },
      fechaInicioTrabajo: { type: Date, default: null },
      fechaEnvioVentas: { type: Date, default: null },
      fechaFinalizacion: { type: Date, default: null },
    },
    estado: {
      type: String,
      enum: ["BORRADOR", "COTIZACION", "APROBADA", "CANCELADA"],
      default: "BORRADOR",
    },
    situacionActual: {
      type: String,
      enum: [
        "NORMAL",
        "NOVEDAD_ABIERTA",
        "ESPERANDO_MATERIAL",
        "PENDIENTE_CLIENTE",
        "TRABAJO_PENDIENTE",
        "CANCELADA",
      ],
      default: "NORMAL",
    },
    novedades: {
      type: [{
        tipo: {
          type: String,
          enum: [
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
          ],
          required: true,
        },
        descripcion: { type: String, required: true, trim: true, uppercase: true },
        responsableCosto: {
          type: String,
          enum: ["NO_APLICA", "POR_DEFINIR", "CLIENTE", "EMPRESA", "ASESOR", "INSTALADOR", "PROVEEDOR"],
          default: "NO_APLICA",
        },
        afectaMaterial: { type: Boolean, default: false },
        afectaPrecio: { type: Boolean, default: false },
        valorImpacto: { type: Number, default: 0, min: 0 },
        estado: {
          type: String,
          enum: ["PENDIENTE", "APROBADA", "RECHAZADA", "RESUELTA"],
          default: "APROBADA",
        },
        serviciosAfectados: { type: [String], default: [] },
        instaladorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        instaladorNombre: { type: String, default: "", trim: true, uppercase: true },
        usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        usuarioNombre: { type: String, default: "" },
        usuarioRol: { type: String, default: "" },
        fecha: { type: Date, default: Date.now },
        revisadoPorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        revisadoPorNombre: { type: String, default: "" },
        fechaRevision: { type: Date, default: null },
        observacionRevision: { type: String, default: "" },
        fechaResolucion: { type: Date, default: null },
        resueltoPorNombre: { type: String, default: "" },
        costoMaterialReal: { type: Number, default: 0, min: 0 },
        cortesReposicion: { type: [mongoose.Schema.Types.ObjectId], ref: "Corte", default: [] },
      }],
      default: [],
    },
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    asesorNombre: {
      type: String,
      required: true,
      trim: true,
    },
    asesorRol: {
      type: String,
      default: "ASESOR",
    },
    auditoria: {
      type: [{
        accion: { type: String, required: true },
        descripcion: { type: String, default: "" },
        usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        usuarioNombre: { type: String, default: "" },
        fecha: { type: Date, default: Date.now },
      }],
      default: [],
    },
  },
  { timestamps: true, optimisticConcurrency: true }
);

asesoriaSchema.post("init", function (doc) {
  doc.$locals.estadoAnterior = capturarEstado(doc);
});
const validarAvanceFirmado = (orden) => {
  if (orden.coordinacion?.calidad?.requerida && ["PENDIENTE_PAGO", "FINALIZADA"].includes(orden.flujo?.etapa) && orden.coordinacion.calidad.estado !== "APROBADA") throw new Error("El coordinador debe aprobar calidad antes de entrega o caja");
  if (!orden.autorizaciones?.requeridas) return;
  if (["PENDIENTE_COORDINACION", "PENDIENTE_APROBACION_CORTE", "PENDIENTE_INVENTARIO", "EN_PROCESO", "MATERIAL_LISTO", "EN_INSTALACION", "PENDIENTE_CALIDAD", "REPROCESO", "PENDIENTE_PAGO", "FINALIZADA"].includes(orden.flujo?.etapa)) validarFirmasTrabajo(orden);
  if (orden.flujo?.etapa === "FINALIZADA") validarFirmaEntrega(orden);
};
asesoriaSchema.pre("save", function () {
  validarAvanceFirmado(this);
  registrarCambios(this, this.$locals.estadoAnterior || {}, new Date());
});
asesoriaSchema.post("save", function (doc) {
  doc.$locals.estadoAnterior = capturarEstado(doc);
});
// Query updates (billing and administrative changes) must record the same history.
for (const operacion of ["findOneAndUpdate", "updateOne"]) {
  asesoriaSchema.pre(operacion, async function () {
    const update = this.getUpdate();
    if (!update || Array.isArray(update)) return;
    const cambios = { ...Object.fromEntries(Object.entries(update).filter(([key]) => !key.startsWith("$"))), ...update.$set };
    if (!Object.keys(cambios).some((key) => /^(flujo|coordinacion|pago|autorizaciones)(\.|$)/.test(key))) return;
    const orden = await this.model.findOne(this.getFilter());
    if (!orden) return;
    const anterior = capturarEstado(orden);
    for (const [key, value] of Object.entries(cambios)) {
      let ruta = key;
      if (key.startsWith("autorizaciones.documentos.$.")) {
        const filtro = this.getFilter();
        const documentoId = filtro["autorizaciones.documentos._id"] || filtro["autorizaciones.documentos"]?.$elemMatch?._id;
        const indice = orden.autorizaciones.documentos.findIndex((d) => String(d._id) === String(documentoId));
        if (indice < 0) throw new Error("Documento no encontrado para actualizar");
        ruta = key.replace("autorizaciones.documentos.$.", `autorizaciones.documentos.${indice}.`);
      }
      orden.set(ruta, value);
    }
    validarAvanceFirmado(orden);
    update.$inc ||= {};
    update.$inc.__v = (update.$inc.__v || 0) + 1;
    const audit = update.$push?.auditoria;
    if (audit) orden.auditoria.push(...(audit.$each || [audit]));
    const inicio = orden.trazabilidad.length;
    registrarCambios(orden, anterior, new Date());
    const eventos = orden.trazabilidad.slice(inicio).map((item) => item.toObject());
    if (!eventos.length) { this.setUpdate(update); return; }
    update.$push ||= {};
    const previo = update.$push.trazabilidad;
    update.$push.trazabilidad = { $each: [...(previo?.$each || (previo ? [previo] : [])), ...eventos] };
    this.setUpdate(update);
  });
}


asesoriaSchema.index({ "autorizaciones.documentos.tokenHash": 1 });
asesoriaSchema.index({ "cliente.cedula": 1, createdAt: -1 });
asesoriaSchema.index({ "vehiculo.placa": 1, createdAt: -1 });
asesoriaSchema.index({ "flujo.etapa": 1, updatedAt: -1 });
asesoriaSchema.index({ "coordinacion.asignaciones.instaladorId": 1, updatedAt: -1 });
asesoriaSchema.index({ creadoPor: 1, createdAt: -1 });

export default mongoose.model("Asesoria", asesoriaSchema);
