import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireAnyPermission, requirePermission, requireRole } from "../../middlewares/permission.middleware.js";
import {
  createBorradorAsesoria,
  getCatalogoDisponible,
  getClienteAsesoria,
  searchClientesAsesoria,
  getAsesorias,
  getAsesoriaPorId,
  getHistorialServicio,
  sendAsesoriaToSales,
  updateAsesoria,
  createNovedadAsesoria,
  reviewNovedadAsesoria,
  reviewGarantiaAsesoria,
  resolveNovedadAsesoria,
  getOrigenesGarantia,
} from "./asesor.controller.js";

const router = Router();

const soloAdministracion = requireRole("ADMIN", "SUPERUSUARIO");
router.get("/historial-servicios", authMiddleware, soloAdministracion, getAsesorias);
router.get("/historial-servicios/:id", authMiddleware, soloAdministracion, getHistorialServicio);

router.get(
  "/materiales",
  authMiddleware,
  requirePermission("asesores", "read"),
  getCatalogoDisponible
);

router.put(
  "/servicios/:id",
  authMiddleware,
  requirePermission("asesores", "write"),
  updateAsesoria
);

router.post(
  "/servicios/:id/novedades",
  authMiddleware,
  requireRole("ADMIN", "SUPERUSUARIO", "INVENTARIO", "COORDINADOR"),
  createNovedadAsesoria
);

router.patch(
  "/servicios/:id/novedades/:novedadId",
  authMiddleware,
  requireRole("ADMIN", "SUPERUSUARIO"),
  reviewNovedadAsesoria
);

router.patch(
  "/servicios/:id/novedades/:novedadId/resolver",
  authMiddleware,
  requireRole("ADMIN", "SUPERUSUARIO"),
  resolveNovedadAsesoria
);

router.patch(
  "/servicios/:id/garantia",
  authMiddleware,
  requireRole("ADMIN", "SUPERUSUARIO"),
  reviewGarantiaAsesoria
);

router.get(
  "/garantias/origenes",
  authMiddleware,
  requirePermission("asesores", "read"),
  getOrigenesGarantia
);

router.get(
  "/servicios",
  authMiddleware,
  requirePermission("asesores", "read"),
  getAsesorias
);

router.get(
  "/servicios/:id",
  authMiddleware,
  requireAnyPermission(["asesores", "read"], ["cortes", "read"], ["ventas", "read"]),
  getAsesoriaPorId
);

router.patch(
  "/servicios/:id/enviar-ventas",
  authMiddleware,
  requirePermission("cortes", "write"),
  sendAsesoriaToSales
);

router.get(
  "/clientes",
  authMiddleware,
  requirePermission("asesores", "read"),
  searchClientesAsesoria
);

router.get(
  "/clientes/:cedula",
  authMiddleware,
  requirePermission("asesores", "read"),
  getClienteAsesoria
);

router.post(
  "/borradores",
  authMiddleware,
  requirePermission("asesores", "write"),
  createBorradorAsesoria
);

export default router;
