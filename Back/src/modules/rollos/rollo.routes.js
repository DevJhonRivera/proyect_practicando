import { Router } from "express";

import {
  createRollo,
  getRollos,
  getRolloById,
  moverRolloUso,
  getRollosPorEstado,
  cerrarRollo,
} from "./rollo.controller.js";

import {
  authMiddleware,
} from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  requirePermission("rollos", "write"),
  createRollo
);

router.get(
  "/",
  authMiddleware,
  requirePermission("rollos", "read"),
  getRollos
);

router.get(
  "/estado/:estado",
  authMiddleware,
  requirePermission("rollos", "read"),
  getRollosPorEstado
);

router.patch(
  "/:id/uso",
  authMiddleware,
  requirePermission("rollos", "update"),
  moverRolloUso
);

router.patch(
  "/:id/cerrar",
  authMiddleware,
  requirePermission("rollos", "update"),
  cerrarRollo
);

router.get(
  "/:id",
  authMiddleware,
  requirePermission("rollos", "read"),
  getRolloById
);

export default router;
