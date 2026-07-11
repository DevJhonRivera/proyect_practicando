import { Router } from "express";

import {
  createRetazo,
  deleteRetazo,
  getRetazoCompatible,
  getRetazos,
  getRetazosDisponibles,
} from "./retazo.controller.js";

import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  getRetazos
);

router.get(
  "/disponibles",
  authMiddleware,
  getRetazosDisponibles
);

router.get(
  "/compatible",
  authMiddleware,
  getRetazoCompatible
);

router.post(
  "/",
  authMiddleware,
  createRetazo
);

router.delete(
  "/:id",
  authMiddleware,
  deleteRetazo
);

export default router;
