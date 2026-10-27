import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/permission.middleware.js";
import { getBandejaInventario } from "./inventario.controller.js";

const router = Router();

router.get("/bandeja", authMiddleware, requireRole("INVENTARIO", "ADMIN", "SUPERUSUARIO"), getBandejaInventario);

export default router;
