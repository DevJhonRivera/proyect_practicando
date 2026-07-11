import {
  clasificarRolloRecepcion,
  crearRecepcion,
  obtenerRecepciones,
  obtenerRecepcionPorId,
} from "./recepcion.service.js";

export const createRecepcion = async (
  req,
  res
) => {
  try {
    const recepcion =
      await crearRecepcion(req.body);

    res.status(201).json(recepcion);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getRecepciones =
  async (req, res) => {
    try {
      const recepciones =
        await obtenerRecepciones();

      res.json(recepciones);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getRecepcionById =
  async (req, res) => {
    try {
      const recepcion =
        await obtenerRecepcionPorId(
          req.params.id
        );

      if (!recepcion) {
        return res.status(404).json({
          message:
            "Recepción no encontrada",
        });
      }

      res.json(recepcion);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const clasificarRollo =
  async (req, res) => {
    try {
      const result =
        await clasificarRolloRecepcion(
          req.params.id,
          req.body
        );

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  };
