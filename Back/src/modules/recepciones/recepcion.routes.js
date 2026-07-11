import { Router } from "express";

import {
  clasificarRollo,
  createRecepcion,
  getRecepcionById,
  getRecepciones,
} from "./recepcion.controller.js";

import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  createRecepcion
);

router.get(
  "/",
  authMiddleware,
  getRecepciones
);

router.get(
  "/:id",
  authMiddleware,
  getRecepcionById
);

router.post(
  "/:id/rollos",
  authMiddleware,
  clasificarRollo
);

export default router;
