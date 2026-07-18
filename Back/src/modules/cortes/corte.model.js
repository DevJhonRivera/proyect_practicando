import mongoose from "mongoose";

const auditoriaSchema = new mongoose.Schema(
    {
        fecha: {
            type: Date,
            default: Date.now
        },
        accion: {
            type: String,
            required: true
        },
        descripcion: {
            type: String,
            default: ""
        },
        usuarioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        usuarioNombre: {
            type: String,
            default: ""
        },
        usuarioRol: {
            type: String,
            default: ""
        },
        cambios: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        _id: false
    }
);

const corteSchema = new mongoose.Schema(
    {
        rolloId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Rollo"
        },

        retazoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Retazo"
        },

        origenMaterial: {
            type: String,
            enum: [
                "ROLLO",
                "RETAZO"
            ],
            default: "ROLLO"
        },

        fecha: {
            type: Date,
            default: Date.now
        },

        marca: {
            type: String,
            required: true,
            trim: true
        },

        placa: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
        },

        modelo: {
            type: String,
            required: true,
            trim: true
        },

        tipoServicio: {
            type: String,
            enum: [
                "VENTA",
                "GARANTIA",
                "GARANTIA_INSTALADOR",
                "GARANTIA_EMPRESA"
            ]
        },

        instalador: {
            type: String,
            trim: true,
            default: ""
        },

        tipoCorte: {
            type: String,
            enum: [
                "PANORAMICO",
                "LUNETA",
                "DELANTERAS",
                "TRASERAS",
                "FIJOS",
                "SUNROOF", 
                "COMPLETO",
                "OTROS"
            ]
        },

        tipoCorteDetalle: {
            type: String,
            trim: true,
            default: ""
        },

        metrosUtilizados: {
            type: Number,
            required: true,
            min:0.05
        },

        valorVenta: {
            type: Number,
            default: 0
        },

        costoMaterialCop: {
            type: Number,
            default: 0
        },

        utilidadBrutaCop: {
            type: Number,
            default: 0
        },

        margenBrutoPorcentaje: {
            type: Number,
            default: 0
        },

        ventaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Venta"
        },

        codigoVenta: {
            type: String,
            default: ""
        },

        ventaEstado: {
            type: String,
            enum: [
                "PENDIENTE",
                "PAGADA",
                "ANULADA",
                ""
            ],
            default: ""
        },

        remanenteDescartado: {
            type: Number,
            default: 0
        },

        auditoria: {
            type: [auditoriaSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);

corteSchema.index({
    marca: 1,
    modelo: 1,
    createdAt: -1
});

export default mongoose.model(
    "Corte",
    corteSchema
);
