import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/permission.middleware.js";
import { adjustAccesorio, createAccesorio, deleteAccesorio, getAccesorios, updateAccesorio } from "./accesorio.controller.js";

const router = Router();
router.get("/", authMiddleware, requireRole("ASESOR", "INVENTARIO", "ADMIN", "SUPERUSUARIO"), getAccesorios);
router.post("/", authMiddleware, requireRole("INVENTARIO", "ADMIN", "SUPERUSUARIO"), createAccesorio);
router.put("/:id", authMiddleware, requireRole("INVENTARIO", "ADMIN", "SUPERUSUARIO"), updateAccesorio);
router.patch("/:id/stock", authMiddleware, requireRole("INVENTARIO", "ADMIN", "SUPERUSUARIO"), adjustAccesorio);
router.delete("/:id", authMiddleware, requireRole("INVENTARIO", "ADMIN", "SUPERUSUARIO"), deleteAccesorio);
export default router;
