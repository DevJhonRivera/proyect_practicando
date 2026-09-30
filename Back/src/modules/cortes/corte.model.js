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

const piezaCortePpfSchema = new mongoose.Schema(
    {
        piezaPpfId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PiezaPpf"
        },
        pieza: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
        },
        ubicacion: {
            type: String,
            enum: ["EXTERIOR", "INTERIOR"],
            required: true
        },
        cantidad: {
            type: Number,
            min: 1,
            default: 1
        },
        anchoCm: {
            type: Number,
            min: 0,
            default: 0
        },
        largoCm: {
            type: Number,
            min: 0,
            default: 0
        },
        rotada: {
            type: Boolean,
            default: false
        }
    },
    {
        _id: false
    }
);

const corteSchema = new mongoose.Schema(
    {
        asesoriaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Asesoria",
            default: null
        },

        asesoriaLinea: {
            type: String,
            default: "",
            trim: true
        },

        partesServicio: {
            type: [String],
            default: []
        },

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
                "GARANTIA_EMPRESA",
                "GARANTIA_PROVEEDOR"
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
                "PIEZAS_PPF",
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

        esCortePpf: {
            type: Boolean,
            default: false
        },

        piezasPpf: {
            type: [piezaCortePpfSchema],
            default: []
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
                "PARCIAL",
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

corteSchema.index(
    { asesoriaId: 1, asesoriaLinea: 1 },
    {
        unique: true,
        partialFilterExpression: {
            asesoriaId: { $exists: true },
            asesoriaLinea: { $type: "string", $gt: "" }
        }
    }
);

export default mongoose.model(
    "Corte",
    corteSchema
);
