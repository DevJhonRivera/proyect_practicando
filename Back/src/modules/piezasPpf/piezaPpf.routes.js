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
  requirePermission("piezasPpf", "read"),
  getPiezasPpf
);

router.post(
  "/",
  authMiddleware,
  requirePermission("piezasPpf", "write"),
  createPiezaPpf
);

router.put(
  "/:id",
  authMiddleware,
  requirePermission("piezasPpf", "write"),
  updatePiezaPpf
);

router.delete(
  "/:id",
  authMiddleware,
  requirePermission("piezasPpf", "delete"),
  deletePiezaPpf
);

export default router;
