import {
  buscarRetazoCompatible,
  crearRetazo,
  descartarRetazo,
  obtenerRetazos,
  obtenerRetazosDisponibles,
} from "./retazo.service.js";

export const createRetazo =
  async (req, res) => {
    try {
      const retazo =
        await crearRetazo(req.body);

      res.status(201).json(retazo);
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  };

export const getRetazos =
  async (req, res) => {
    try {
      const retazos =
        await obtenerRetazos();

      res.json(retazos);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getRetazosDisponibles =
  async (req, res) => {
    try {
      const retazos =
        await obtenerRetazosDisponibles();

      res.json(retazos);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getRetazoCompatible =
  async (req, res) => {
    try {
      const retazo =
        await buscarRetazoCompatible(
          req.query
        );

      res.json(retazo);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const deleteRetazo =
  async (req, res) => {
    try {
      const retazo =
        await descartarRetazo(
          req.params.id
        );

      res.json(retazo);
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  };
