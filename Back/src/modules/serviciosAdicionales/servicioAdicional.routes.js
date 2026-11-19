import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireAnyPermission, requireRole } from "../../middlewares/permission.middleware.js";
import { createServicioAdicional, deleteServicioAdicional, getServiciosAdicionales } from "./servicioAdicional.controller.js";

const router = Router();
router.get("/", authMiddleware, requireAnyPermission(["asesores", "read"], ["coordinacion", "read"]), getServiciosAdicionales);
router.post("/", authMiddleware, requireRole("ADMIN", "SUPERUSUARIO"), createServicioAdicional);
router.delete("/:id", authMiddleware, requireRole("ADMIN", "SUPERUSUARIO"), deleteServicioAdicional);
export default router;
