import {
  actualizarCorte,
  obtenerCortes,
  obtenerSugerenciasCortes,
  registrarCorte,
} from "./corte.service.js";

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

      res.json(cortes);
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
