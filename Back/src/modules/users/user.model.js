import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true
    },

    correo: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true
    },

    rol: {
      type: String,
      enum: [
        "SUPERUSUARIO",
        "ADMIN",
        "INVENTARIO",
        "VENTAS",
        "ASESOR",
        "COORDINADOR",
        "INSTALADOR",
      ],
      default: "INVENTARIO"
    },

    remuneracion: {
      modalidad: { type: String, enum: ["SOLO_COMISION", "SOLO_SALARIO", "SALARIO_COMISION"], default: "SOLO_COMISION" },
      salarioMensual: { type: Number, default: 0, min: 0 },
    },

    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    suspendido: {
      type: Boolean,
      default: false
    },

    suspensionIndefinida: {
      type: Boolean,
      default: false
    },

    suspendidoHasta: {
      type: Date,
      default: null
    },

    suspendidoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    tokenVersion: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("User", userSchema);
