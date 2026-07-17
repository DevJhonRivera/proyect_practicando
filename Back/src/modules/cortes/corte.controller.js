import {
  actualizarCorte,
  obtenerCortes,
  obtenerSugerenciasCortes,
  registrarCorte,
} from "./corte.service.js";

const rolesConCostos = [
  "SUPERUSUARIO",
  "ADMIN",
  "INVENTARIO",
];

const limpiarCostosMaterial = (material = {}) => {
  if (!material || typeof material !== "object") {
    return material;
  }

  const data =
    typeof material.toObject === "function"
      ? material.toObject()
      : { ...material };

  delete data.costoUnitarioCop;
  delete data.costoPorMetroCop;
  delete data.costoTotalAsignadoCop;
  delete data.costeoPedidoId;
  delete data.costoAsignadoAt;

  return data;
};

const ocultarCostosCorte = (corte) => {
  const data =
    typeof corte.toObject === "function"
      ? corte.toObject()
      : { ...corte };

  delete data.costoMaterialCop;
  delete data.utilidadCop;
  data.rolloId = limpiarCostosMaterial(data.rolloId);
  data.retazoId = limpiarCostosMaterial(data.retazoId);

  return data;
};

export const createCorte =
  async (req, res) => {
    try {
      const corte =
        await registrarCorte(
          req.body,
          req.user
        );

      res.status(201).json(corte);
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  };
export const getCortes =
  async (req, res) => {
    try {
      const cortes =
        await obtenerCortes();

      if (rolesConCostos.includes(req.user?.rol)) {
        return res.json(cortes);
      }

      res.json(cortes.map(ocultarCostosCorte));
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getSugerenciasCortes =
  async (req, res) => {
    try {
      const sugerencias =
        await obtenerSugerenciasCortes({
          marca: req.query.marca,
          modelo: req.query.modelo,
          tipoCorte: req.query.tipoCorte,
        });

      res.json({
        success: true,
        data: sugerencias,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
  
export const updateCorte =
  async (req, res) => {
    try {
      const corte =
        await actualizarCorte(
          req.params.id,
          req.body,
          req.user
        );

      res.json(corte);
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  };
