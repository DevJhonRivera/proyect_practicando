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
        enum: ["PENDIENTE", "PARCIAL", "PAGADO"],
        default: "PENDIENTE",
      },
      valorRecibido: { type: Number, default: 0, min: 0 },
      recibidoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      recibidoPorNombre: { type: String, default: "" },
      fechaPago: { type: Date, default: null },
      metodoPagoFinal: { type: String, default: "" },
    },
    flujo: {
      etapa: {
        type: String,
        enum: ["PENDIENTE_INVENTARIO", "EN_PROCESO", "PENDIENTE_PAGO", "FINALIZADA", "CANCELADA"],
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
