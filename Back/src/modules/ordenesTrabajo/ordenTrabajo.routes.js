import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { getOrdenesTrabajo } from "./ordenTrabajo.controller.js";

const router = Router();
router.get("/", authMiddleware, requirePermission("dashboard", "read"), getOrdenesTrabajo);
export default router;
