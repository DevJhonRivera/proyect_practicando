import {
  actualizarVenta,
  actualizarEstadoVenta,
  crearVenta,
  obtenerVentaPorId,
  obtenerVentas,
} from "./venta.service.js";

export const createVenta =
  async (req, res) => {
    try {
      const venta =
        await crearVenta(req.body, req.user);

      res.status(201).json(venta);
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  };

export const getVentas =
  async (req, res) => {
    try {
      const ventas =
        await obtenerVentas();

      res.json(ventas);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getVentaById =
  async (req, res) => {
    try {
      const venta =
        await obtenerVentaPorId(req.params.id);

      if (!venta) {
        return res.status(404).json({
          message: "Venta no encontrada",
        });
      }

      res.json(venta);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const updateVenta =
  async (req, res) => {
    try {
      const venta =
        await actualizarVenta(
          req.params.id,
          req.body,
          req.user
        );

      res.json(venta);
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  };

export const updateEstadoVenta =
  async (req, res) => {
    try {
      const venta =
        await actualizarEstadoVenta(
          req.params.id,
          req.body.estado,
          req.user
        );

      res.json(venta);
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  };
