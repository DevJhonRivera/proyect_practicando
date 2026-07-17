import { Router } from "express";

import {
  getAlertas,
  updateAlerta,
} from "./alerta.controller.js";

import { authMiddleware }
from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  requirePermission("alertas", "read"),
  getAlertas
);

router.patch(
  "/:id/atender",
  authMiddleware,
  requirePermission("alertas", "write"),
  updateAlerta
);

export default router;
