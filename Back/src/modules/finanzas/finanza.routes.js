import { Router } from "express";

import {
  getCosteoPedido,
  getCosteos,
  getReporteFinanciero,
  getResumenFinanciero,
  saveCosteoPedido,
} from "./finanza.controller.js";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

const router = Router();

router.get(
  "/resumen",
  authMiddleware,
  requirePermission("finanzas", "read"),
  getResumenFinanciero
);

router.get(
  "/reporte",
  authMiddleware,
  requirePermission("finanzas", "read"),
  getReporteFinanciero
);

router.get(
  "/costeos",
  authMiddleware,
  requirePermission("finanzas", "read"),
  getCosteos
);

router.get(
  "/costeos/:pedidoId",
  authMiddleware,
  requirePermission("finanzas", "read"),
  getCosteoPedido
);

router.post(
  "/costeos",
  authMiddleware,
  requirePermission("finanzas", "write"),
  saveCosteoPedido
);

export default router;
