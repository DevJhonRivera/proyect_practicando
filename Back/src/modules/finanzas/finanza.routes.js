import { Router } from "express";

import {
  getCosteoPedido,
  getCosteos,
  getReporteFinanciero,
  getResumenFinanciero,
  saveCosteoPedido,
} from "./finanza.controller.js";

import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/resumen",
  authMiddleware,
  getResumenFinanciero
);

router.get(
  "/reporte",
  authMiddleware,
  getReporteFinanciero
);

router.get(
  "/costeos",
  authMiddleware,
  getCosteos
);

router.get(
  "/costeos/:pedidoId",
  authMiddleware,
  getCosteoPedido
);

router.post(
  "/costeos",
  authMiddleware,
  saveCosteoPedido
);

export default router;
