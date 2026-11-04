import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission, requireRole } from "../../middlewares/permission.middleware.js";
import { patchCalidad, getInstaladores, getOrdenes, patchAsignacion, patchEnviarVentas, patchMaterialListo, patchRevision, putPropuesta } from "./coordinacion.controller.js";

const router = Router();
router.get("/ordenes", authMiddleware, requirePermission("coordinacion", "read"), getOrdenes);
router.get("/instaladores", authMiddleware, requireRole("ASESOR", "COORDINADOR", "ADMIN", "SUPERUSUARIO"), getInstaladores);
router.put("/ordenes/:id/propuesta", authMiddleware, requireRole("COORDINADOR", "ADMIN", "SUPERUSUARIO"), putPropuesta);
router.patch("/ordenes/:id/revision", authMiddleware, requireRole("INVENTARIO", "ADMIN", "SUPERUSUARIO"), patchRevision);
router.patch("/ordenes/:id/material-listo", authMiddleware, requireRole("INVENTARIO", "ADMIN", "SUPERUSUARIO"), patchMaterialListo);
router.patch("/ordenes/:id/asignaciones/:asignacionId", authMiddleware, requireRole("INSTALADOR", "COORDINADOR", "ADMIN", "SUPERUSUARIO"), patchAsignacion);
router.patch("/ordenes/:id/enviar-ventas", authMiddleware, requireRole("COORDINADOR", "ADMIN", "SUPERUSUARIO"), patchEnviarVentas);
router.patch("/ordenes/:id/calidad", authMiddleware, requireRole("COORDINADOR", "ADMIN", "SUPERUSUARIO"), patchCalidad);
router.patch("/ordenes/:id/recibir-reproceso", authMiddleware, requireRole("COORDINADOR", "ADMIN", "SUPERUSUARIO"), patchMaterialListo);
export default router;
