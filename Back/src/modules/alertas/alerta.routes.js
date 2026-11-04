import { Router } from "express";

import {
  getAlertas,
  updateAlerta,
} from "./alerta.controller.js";

import { authMiddleware }
from "../../middlewares/auth.middleware.js";
import { requireAnyPermission } from "../../middlewares/permission.middleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  requireAnyPermission(["alertas", "read"], ["asesores", "read"]),
  getAlertas
);

router.patch(
  "/:id/atender",
  authMiddleware,
  requireAnyPermission(["alertas", "write"], ["asesores", "write"]),
  updateAlerta
);

export default router;
