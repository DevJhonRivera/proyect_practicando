import { Router } from "express";

import {
  getAlertas,
  updateAlerta,
} from "./alerta.controller.js";

import { authMiddleware }
from "../../middlewares/auth.middleware.js";
import { requireAnyPermission } from "../../middlewares/permission.middleware.js";

const router = Router();
// Acknowledging an alert uses the same inbox scope as listing it.
const requireInboxAccess = requireAnyPermission(["alertas", "read"], ["asesores", "read"]);

router.get(
  "/",
  authMiddleware,
  requireInboxAccess,
  getAlertas
);

router.patch(
  "/:id/atender",
  authMiddleware,
  requireInboxAccess,
  updateAlerta
);

export default router;
