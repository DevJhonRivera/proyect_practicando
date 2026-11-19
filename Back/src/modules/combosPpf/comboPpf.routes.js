import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireAnyPermission, requireRole } from "../../middlewares/permission.middleware.js";
import { deleteComboPpf, getCombosPpf, postComboPpf } from "./comboPpf.controller.js";

const router = Router();
router.get("/", authMiddleware, requireAnyPermission(["asesores", "read"], ["asesores", "write"]), getCombosPpf);
router.post("/", authMiddleware, requireRole("ASESOR", "ADMIN", "SUPERUSUARIO"), postComboPpf);
router.delete("/:id", authMiddleware, requireRole("ASESOR", "ADMIN", "SUPERUSUARIO"), deleteComboPpf);
export default router;
