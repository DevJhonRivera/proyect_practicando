import { Router } from "express";

import {
  createVenta,
  getVentaById,
  getVentas,
  updateVenta,
  updateEstadoVenta,
} from "./venta.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  createVenta
);

router.get(
  "/",
  authMiddleware,
  getVentas
);

router.get(
  "/:id",
  authMiddleware,
  getVentaById
);

router.put(
  "/:id",
  authMiddleware,
  updateVenta
);

router.patch(
  "/:id/estado",
  authMiddleware,
  updateEstadoVenta
);

export default router;
