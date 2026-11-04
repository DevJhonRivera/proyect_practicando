import { Router } from "express";

import {
  createVenta,
  getVentaById,
  getVentas,
  updateVenta,
  updateEstadoVenta,
  createMovimientoPago,
} from "./venta.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission, requireRole } from "../../middlewares/permission.middleware.js";

import { gestionarCorreoFactura } from "./facturaCorreo.service.js";

const router = Router();
router.post("/:id/comprobante-correo", authMiddleware, requirePermission("ventas", "write"), async (req, res) => {
  try { res.json(await gestionarCorreoFactura(req.params.id, req.body, req.user)); }
  catch (error) { res.status(400).json({ message: error.message }); }
});

router.post(
  "/",
  authMiddleware,
  requirePermission("ventas", "write"),
  createVenta
);

router.get(
  "/",
  authMiddleware,
  requirePermission("ventas", "read"),
  getVentas
);

router.get(
  "/:id",
  authMiddleware,
  requirePermission("ventas", "read"),
  getVentaById
);

router.put(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "SUPERUSUARIO"),
  updateVenta
);

router.patch(
  "/:id/estado",
  authMiddleware,
  requireRole("VENTAS", "ADMIN", "SUPERUSUARIO"),
  updateEstadoVenta
);

router.post(
  "/:id/pagos",
  authMiddleware,
  requirePermission("ventas", "write"),
  createMovimientoPago
);

export default router;
