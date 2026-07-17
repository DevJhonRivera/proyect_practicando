import mongoose from "mongoose";

const rolePermissionSchema = new mongoose.Schema(
  {
    rol: {
      type: String,
      enum: ["ADMIN", "INVENTARIO", "VENTAS"],
      required: true,
      unique: true,
    },
    permisos: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "RolePermission",
  rolePermissionSchema
);
