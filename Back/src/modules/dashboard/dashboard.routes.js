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

const router = Router();

router.get(
  "/",
  authMiddleware,
  getDashboard
);
router.get(
  "/stats",
  authMiddleware,
  getDashboardStats
);

router.get(
  "/alerts",
  authMiddleware,
  getDashboardAlerts
);

router.get(
  "/orders",
  authMiddleware,
  getDashboardOrders
);

router.get(
  "/sales",
  authMiddleware,
  getDashboardSales
);

export default router;
