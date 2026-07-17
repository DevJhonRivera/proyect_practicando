import { Router } from "express";

import {
  createUsuario,
  deleteUsuario,
  getUsuarios,
  updateUsuarioRol,
} from "./user.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  requirePermission("usuarios", "read"),
  getUsuarios
);

router.post(
  "/",
  authMiddleware,
  requirePermission("usuarios", "write"),
  createUsuario
);

router.patch(
  "/:id/rol",
  authMiddleware,
  requirePermission("usuarios", "write"),
  updateUsuarioRol
);

router.delete(
  "/:id",
  authMiddleware,
  requirePermission("usuarios", "delete"),
  deleteUsuario
);

export default router;
