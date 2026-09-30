import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission, requireRole } from "../../middlewares/permission.middleware.js";
import {
  createBorradorAsesoria,
  getCatalogoDisponible,
  getClienteAsesoria,
  getAsesorias,
  getAsesoriaPorId,
  sendAsesoriaToSales,
  updateAsesoria,
} from "./asesor.controller.js";

const router = Router();

router.get(
  "/materiales",
  authMiddleware,
  requirePermission("asesores", "read"),
  getCatalogoDisponible
);

router.put(
  "/servicios/:id",
  authMiddleware,
  requireRole("ADMIN", "SUPERUSUARIO"),
  updateAsesoria
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
  requirePermission("cortes", "read"),
  getAsesoriaPorId
);

router.patch(
  "/servicios/:id/enviar-ventas",
  authMiddleware,
  requirePermission("cortes", "write"),
  sendAsesoriaToSales
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
