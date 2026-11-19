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
import { crearHtmlComprobante } from "./comprobantePlantilla.js";
import { validarAccesoComprobante } from "./comprobanteAcceso.js";
import Venta from "./venta.model.js";
import mongoose from "mongoose";

const router = Router();
router.get("/:id/comprobante-cliente", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const noDisponible = () => res.status(404).send("El enlace del comprobante no está disponible. Solicita un enlace actualizado a Polarizados Ya.");
  if (!mongoose.isValidObjectId(req.params.id) || typeof req.query.acceso !== "string" ||
      !/^[a-f0-9]{64}$/.test(req.query.acceso)) return noDisponible();
  try {
    const venta = await Venta.findById(req.params.id).populate("asesoriaId", "cliente vehiculo").lean();
    if (!validarAccesoComprobante(venta, req.query.acceso)) return noDisponible();
    res.type("html").send(crearHtmlComprobante(venta).replace(
      "</body>",
      '<script>document.getElementById("imprimir-comprobante").addEventListener("click", () => window.print());</script></body>',
    ));
  } catch {
    res.status(500).send("No se pudo abrir el comprobante. Inténtalo nuevamente.");
  }
});
router.get("/:id/comprobante", authMiddleware, requirePermission("ventas", "read"), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Venta no válida" });
  try {
    const venta = await Venta.findById(req.params.id).populate("asesoriaId", "cliente vehiculo").lean();
    if (!venta || venta.estado === "ANULADA") return res.status(404).json({ message: "Comprobante no disponible" });
    res.set("Cache-Control", "no-store").json({ html: crearHtmlComprobante(venta) });
  } catch {
    res.status(500).json({ message: "No se pudo abrir el comprobante" });
  }
});
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
