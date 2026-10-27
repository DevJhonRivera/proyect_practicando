import { Router } from "express";

import {
  getCosteoPedido,
  getCosteos,
  getReporteFinanciero,
  getResumenFinanciero,
  saveCosteoPedido,
} from "./finanza.controller.js";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireAnyPermission, requirePermission } from "../../middlewares/permission.middleware.js";

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
  requireAnyPermission(["finanzas", "read"], ["pedidos", "read"]),
  getCosteos
);

router.get(
  "/costeos/:pedidoId",
  authMiddleware,
  requireAnyPermission(["finanzas", "read"], ["pedidos", "read"]),
  getCosteoPedido
);

router.post(
  "/costeos",
  authMiddleware,
  requireAnyPermission(["finanzas", "write"], ["pedidos", "write"]),
  saveCosteoPedido
);

export default router;
