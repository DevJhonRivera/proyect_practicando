import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission, requireRole } from "../../middlewares/permission.middleware.js";
import { deleteMedida, getMedidas, postMedida, putMedida } from "./medidaVehiculo.controller.js";

const router = Router();
router.get("/", authMiddleware, requirePermission("medidasVehiculos", "read"), getMedidas);
router.post("/", authMiddleware, requireRole("COORDINADOR", "ADMIN", "SUPERUSUARIO"), postMedida);
router.put("/:id", authMiddleware, requireRole("COORDINADOR", "ADMIN", "SUPERUSUARIO"), putMedida);
router.delete("/:id", authMiddleware, requireRole("ADMIN", "SUPERUSUARIO"), deleteMedida);
export default router;
