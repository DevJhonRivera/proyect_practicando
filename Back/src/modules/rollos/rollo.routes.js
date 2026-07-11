import { Router } from "express";

import {
  createRollo,
  getRollos,
  getRolloById,
  moverRolloUso,
  getRollosPorEstado,
  cerrarRollo,
} from "./rollo.controller.js";

import {
  authMiddleware,
} from "../../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  createRollo
);

router.get(
  "/",
  authMiddleware,
  getRollos
);

router.get(
  "/estado/:estado",
  authMiddleware,
  getRollosPorEstado
);

router.patch(
  "/:id/uso",
  authMiddleware,
  moverRolloUso
);

router.patch(
  "/:id/cerrar",
  authMiddleware,
  cerrarRollo
);

router.get(
  "/:id",
  authMiddleware,
  getRolloById
);

export default router;
