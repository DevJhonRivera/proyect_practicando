import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { getCatalogoDisponible } from "./asesor.controller.js";

const router = Router();

router.get(
  "/materiales",
  authMiddleware,
  requirePermission("asesores", "read"),
  getCatalogoDisponible
);

export default router;
