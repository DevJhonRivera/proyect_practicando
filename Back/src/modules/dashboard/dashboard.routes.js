import { Router } from "express";

import {
  getDashboard,
  getDashboardAlerts,
  getDashboardOrders,
  getDashboardSales,
  getDashboardStats
} from "./dashboard.controller.js";

import { authMiddleware }
from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  requirePermission("dashboard", "read"),
  getDashboard
);
router.get(
  "/stats",
  authMiddleware,
  requirePermission("dashboard", "read"),
  getDashboardStats
);

router.get(
  "/alerts",
  authMiddleware,
  requirePermission("dashboard", "read"),
  getDashboardAlerts
);

router.get(
  "/orders",
  authMiddleware,
  requirePermission("dashboard", "read"),
  getDashboardOrders
);

router.get(
  "/sales",
  authMiddleware,
  requirePermission("dashboard", "read"),
  getDashboardSales
);

export default router;
