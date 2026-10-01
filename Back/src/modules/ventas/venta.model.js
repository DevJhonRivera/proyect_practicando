import mongoose from "mongoose";

const clienteSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    telefono: {
      type: String,
      trim: true,
      default: "",
    },
    cedula: { type: String, trim: true, default: "" },
    correo: { type: String, trim: true, lowercase: true, default: "" },
  },
  {
    _id: false,
  }
);

const vehiculoSchema = new mongoose.Schema(
  {
    placa: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 5,
      maxlength: 10,
    },
    marca: {
      type: String,
      required: true,
      trim: true,
    },
    modelo: {
      type: String,
      required: true,
      trim: true,
    },
    referencia: { type: String, trim: true, uppercase: true, default: "" },
    anio: { type: String, trim: true, default: "" },
    color: { type: String, trim: true, uppercase: true, default: "" },
  },
  {
    _id: false,
  }
);

const ventaItemSchema = new mongoose.Schema(
  {
    tipoServicio: {
      type: String,
      enum: [
        "POLARIZADO",
        "PPF",
        "PELICULA_SEGURIDAD",
        "LAVADO",
        "POLICHADA",
        "PDR",
        "ASEGURADA",
        "OTRO",
      ],
      required: true,
    },
    descripcion: {
      type: String,
      required: true,
      trim: true,
    },
    corteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corte",
    },
    corteIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Corte",
      },
    ],
    cantidad: {
      type: Number,
      default: 1,
      min: 1,
    },
    valorUnitario: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const auditoriaSchema = new mongoose.Schema(
  {
    fecha: {
      type: Date,
      default: Date.now,
    },
    accion: {
      type: String,
      required: true,
    },
    descripcion: {
      type: String,
      default: "",
    },
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    usuarioNombre: {
      type: String,
      default: "",
    },
    usuarioRol: {
      type: String,
      default: "",
    },
    cambios: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
  }
);

const movimientoPagoSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ["PAGO", "DEVOLUCION"], required: true },
    valor: { type: Number, required: true, min: 0.01 },
    metodoPago: {
      type: String,
      enum: ["EFECTIVO", "TRANSFERENCIA", "DATAFONO", "OTROS", "TARJETA", "CREDITO", "MIXTO"],
      required: true,
    },
    entidadPago: { type: String, default: "", trim: true, uppercase: true },
    referencia: { type: String, default: "", trim: true, uppercase: true },
    observacion: { type: String, default: "", trim: true, uppercase: true },
    comprobanteImagen: { type: String, default: "" },
    comprobanteNombre: { type: String, default: "", trim: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    usuarioNombre: { type: String, default: "" },
    usuarioRol: { type: String, default: "" },
    fecha: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ventaSchema = new mongoose.Schema(
  {
    asesoriaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asesoria",
      default: null,
    },
    codigoVenta: {
      type: String,
      unique: true,
      required: true,
    },
    cliente: {
      type: clienteSchema,
      required: true,
    },
    vehiculo: {
      type: vehiculoSchema,
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    estado: {
      type: String,
      enum: [
        "PENDIENTE",
        "PARCIAL",
        "PAGADA",
        "RECHAZADA",
        "ANULADA",
      ],
      default: "PENDIENTE",
    },
    items: {
      type: [ventaItemSchema],
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length > 0,
        message:
          "Debe agregar al menos un servicio a la venta",
      },
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    descuento: {
      type: Number,
      default: 0,
    },
    metodoPago: {
      type: String,
      enum: ["POR_DEFINIR", "EFECTIVO", "TRANSFERENCIA", "DATAFONO", "OTROS", "TARJETA", "CREDITO", "MIXTO"],
      default: "POR_DEFINIR",
    },
    total: {
      type: Number,
      default: 0,
    },
    pagos: { type: [movimientoPagoSchema], default: [] },
    valorPagado: { type: Number, default: 0, min: 0 },
    valorDevuelto: { type: Number, default: 0, min: 0 },
    saldoPendiente: { type: Number, default: 0, min: 0 },
    observaciones: {
      type: String,
      default: "",
    },
    auditoria: {
      type: [auditoriaSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ventaSchema.index(
  { asesoriaId: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model(
  "Venta",
  ventaSchema
);
