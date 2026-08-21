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
        await obtenerAlertas(req.user);

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
          req.params.id,
          req.user
        );

      if (!alerta) {
        return res.status(404).json({
          message:
            "Alerta no encontrada o no permitida para este perfil",
        });
      }

      res.json(alerta);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
