import { Router } from "express";

import {
  createRetazo,
  deleteRetazo,
  getRetazoCompatible,
  getRetazos,
  getRetazosDisponibles,
} from "./retazo.controller.js";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  requirePermission("retazos", "read"),
  getRetazos
);

router.get(
  "/disponibles",
  authMiddleware,
  requirePermission("retazos", "read"),
  getRetazosDisponibles
);

router.get(
  "/compatible",
  authMiddleware,
  requirePermission("retazos", "read"),
  getRetazoCompatible
);

router.post(
  "/",
  authMiddleware,
  requirePermission("retazos", "write"),
  createRetazo
);

router.delete(
  "/:id",
  authMiddleware,
  requirePermission("retazos", "delete"),
  deleteRetazo
);

export default router;
