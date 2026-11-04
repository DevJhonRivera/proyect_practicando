import mongoose from "mongoose";
const schema = new mongoose.Schema({
  asesoriaId: { type: mongoose.Schema.Types.ObjectId, ref: "Asesoria", required: true, immutable: true },
  sha256: { type: String, required: true, immutable: true },
  dataUrl: { type: String, required: true, immutable: true, select: false },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
}, { timestamps: true });
schema.index({ asesoriaId: 1, sha256: 1 }, { unique: true });
export default mongoose.model("FotoDiagnostico", schema);
