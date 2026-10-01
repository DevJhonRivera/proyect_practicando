import mongoose from "mongoose";

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
    recepcion: {
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
    garantia: {
      esGarantia: { type: Boolean, default: false },
      tipo: { type: String, default: "", trim: true, uppercase: true },
      motivo: { type: String, default: "", trim: true, uppercase: true },
      instalador: { type: String, default: "", trim: true, uppercase: true },
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
        enum: ["PENDIENTE", "PARCIAL", "PAGADO", "RECHAZADO"],
        default: "PENDIENTE",
      },
      valorRecibido: { type: Number, default: 0, min: 0 },
      recibidoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      recibidoPorNombre: { type: String, default: "" },
      fechaPago: { type: Date, default: null },
      metodoPagoFinal: { type: String, default: "" },
    },
    coordinacion: {
      propuesta: {
        type: [{
          linea: { type: String, required: true, trim: true, uppercase: true },
          material: { type: String, default: "", trim: true, uppercase: true },
          partes: { type: [String], default: [] },
          anchoCm: { type: Number, default: 0, min: 0 },
          largoCm: { type: Number, default: 0, min: 0 },
          cantidad: { type: Number, default: 1, min: 1 },
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
        enum: ["PENDIENTE_GARANTIA", "PENDIENTE_COORDINACION", "PENDIENTE_APROBACION_CORTE", "PENDIENTE_INVENTARIO", "EN_PROCESO", "MATERIAL_LISTO", "EN_INSTALACION", "PENDIENTE_PAGO", "FINALIZADA", "CANCELADA"],
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
  { timestamps: true }
);

asesoriaSchema.index({ "cliente.cedula": 1, createdAt: -1 });
asesoriaSchema.index({ "vehiculo.placa": 1, createdAt: -1 });

export default mongoose.model("Asesoria", asesoriaSchema);
