import { Router } from "express";

import {
  clasificarRollo,
  createRecepcion,
  getRecepcionById,
  getRecepciones,
} from "./recepcion.controller.js";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  requirePermission("recepciones", "write"),
  createRecepcion
);

router.get(
  "/",
  authMiddleware,
  requirePermission("recepciones", "read"),
  getRecepciones
);

router.get(
  "/:id",
  authMiddleware,
  requirePermission("recepciones", "read"),
  getRecepcionById
);

router.post(
  "/:id/rollos",
  authMiddleware,
  requirePermission("recepciones", "write"),
  clasificarRollo
);

export default router;
