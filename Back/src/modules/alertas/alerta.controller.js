import {
  obtenerAlertas,
  atenderAlerta,
  verificarStockReserva,
} from "./alerta.service.js";

export const getAlertas =
  async (req, res) => {
    try {
      await verificarStockReserva();

      const alertas =
        await obtenerAlertas();

      res.json(alertas);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const updateAlerta =
  async (req, res) => {
    try {
      const alerta =
        await atenderAlerta(
          req.params.id
        );

      res.json(alerta);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
