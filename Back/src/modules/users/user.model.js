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
      enum: ["ADMIN", "OPERARIO","ASESOR"],
      default: "OPERARIO"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("User", userSchema);