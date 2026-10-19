import { Router } from "express";

import {
  createCorte,
  getCortes,
  getSugerenciasCortes,
  updateCorte,
  createCortesPropuesta,
} from "./corte.controller.js";

import { authMiddleware }
from "../../middlewares/auth.middleware.js";
import { requirePermission, requireRole } from "../../middlewares/permission.middleware.js";

const router = Router();

router.post(
  "/propuesta/:asesoriaId",
  authMiddleware,
  requireRole("INVENTARIO", "ADMIN", "SUPERUSUARIO"),
  createCortesPropuesta
);

router.post(
  "/",
  authMiddleware,
  requirePermission("cortes", "write"),
  createCorte
);

router.get(
  "/sugerencias",
  authMiddleware,
  requirePermission("cortes", "read"),
  getSugerenciasCortes
);

router.get(
  "/",
  authMiddleware,
  requirePermission("cortes", "read"),
  getCortes
);

router.put(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "SUPERUSUARIO"),
  updateCorte
);

export default router;
