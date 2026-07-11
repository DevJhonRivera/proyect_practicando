import * as pedidoService from "./pedido.service.js";
import {
  actualizarPedido,
  crearPedidoCompleto,
  eliminarPedido,
} from "./pedido.service.js";

export const createPedido =
  async (req, res) => {
    try {
      const pedido =
        await crearPedidoCompleto(
          req.body
        );

      res.status(201).json({
        success: true,
        data: pedido,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
export const getPedidos = async (
  req,
  res
) => {
  try {
    const pedidos =
      await pedidoService.obtenerPedidos();

    res.json(pedidos);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deletePedido =
  async (req, res) => {
    try {
      await eliminarPedido(req.params.id);

      res.json({
        success: true,
        message: "Pedido eliminado",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

export const updatePedido =
  async (req, res) => {
    try {
      const pedido =
        await actualizarPedido(
          req.params.id,
          req.body
        );

      res.json({
        success: true,
        data: pedido,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };
