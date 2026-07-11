const recepcionDetalleSchema =
  new mongoose.Schema({

    recepcionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recepcion",
      required: true
    },

    cantidadRollos: {
      type: Number,
      required: true
    },

    clasificados: {
      type: Number,
      default: 0
    },

    descripcion: String
  });