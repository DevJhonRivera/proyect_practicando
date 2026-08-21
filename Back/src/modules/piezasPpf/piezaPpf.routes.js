import { Router } from "express";

import {
  createPiezaPpf,
  deletePiezaPpf,
  getPiezasPpf,
  updatePiezaPpf,
} from "./piezaPpf.controller.js";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  requirePermission("cortes", "read"),
  getPiezasPpf
);

router.post(
  "/",
  authMiddleware,
  requirePermission("cortes", "write"),
  createPiezaPpf
);

router.put(
  "/:id",
  authMiddleware,
  requirePermission("cortes", "write"),
  updatePiezaPpf
);

router.delete(
  "/:id",
  authMiddleware,
  requirePermission("cortes", "delete"),
  deletePiezaPpf
);

export default router;
