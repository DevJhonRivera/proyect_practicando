import pedidoModel from "../pedidos/pedido.model.js";
import {
    registrarRollo,
    obtenerRolloPorId,
    obtenerRollos,
    pasarAUso,
    obtenerRollosPorEstado,
    cerrarRolloAgotado,
} from "./rollo.service.js";

export const createRollo =
  async (req, res) => {
    try {

      const pedido =
        await pedidoModel.findOne({
          codigoPedido:
            req.body.codigoPedido
        });

      if (!pedido) {
        return res.status(400).json({
          message:
            "El pedido no existe"
        });
      }

      const rollo =
        await registrarRollo({
          ...req.body,
          pedidoId:
            pedido._id
        });

      res.status(201).json(rollo);

    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };

export const getRollos = async (
    req,
    res
) => {
    try {
        const rollos =
            await obtenerRollos();

        res.status(200).json({
            success: true,
            data: rollos,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getRolloById =
    async (req, res) => {
        try {
            const rollo =
                await obtenerRolloPorId(
                    req.params.id
                );

            if (!rollo) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Rollo no encontrado",
                });
            }

            res.status(200).json({
                success: true,
                data: rollo,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };

export const moverRolloUso =
async (req,res) => {

  try {

    const rollo =
      await pasarAUso(
        req.params.id
      );

    res.status(200).json({

      message:
        "Rollo enviado a uso",

      data: rollo

    });

  } catch(error) {

    res.status(400).json({
      message:
        error.message
    });

  }

};

export const cerrarRollo =
async (req,res) => {
  try {
    const resultado =
      await cerrarRolloAgotado(
        req.params.id,
        req.body
      );

    res.status(200).json({
      message:
        "Rollo agotado",
      data:
        resultado,
    });
  } catch(error) {
    res.status(400).json({
      message:
        error.message
    });
  }
};

export const getRollosPorEstado =
    async (req, res) => {
        try {
            const rollos =
                await obtenerRollosPorEstado(
                    req.params.estado
                );

            res.json({
                success: true,
                data: rollos,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };
