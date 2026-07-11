import {
  guardarCosteoPedido,
  obtenerCosteoPorPedido,
  obtenerCosteos,
  obtenerReporteFinanciero,
  obtenerResumenFinanciero,
} from "./finanza.service.js";

export const getCosteos =
  async (req, res) => {
    try {
      const costeos =
        await obtenerCosteos();

      res.json(costeos);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getCosteoPedido =
  async (req, res) => {
    try {
      const costeo =
        await obtenerCosteoPorPedido(
          req.params.pedidoId
        );

      res.json(costeo);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const saveCosteoPedido =
  async (req, res) => {
    try {
      const costeo =
        await guardarCosteoPedido(
          req.body
        );

      res.status(201).json(costeo);
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  };

export const getResumenFinanciero =
  async (req, res) => {
    try {
      const resumen =
        await obtenerResumenFinanciero();

      res.json(resumen);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getReporteFinanciero =
  async (req, res) => {
    try {
      const reporte =
        await obtenerReporteFinanciero();

      res.json(reporte);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
