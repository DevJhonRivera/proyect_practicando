import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  getMisPermisos,
  getPermisosRoles,
  updatePermisosRol,
} from "./rolePermission.controller.js";

const router = Router();

router.get(
  "/mis-permisos",
  authMiddleware,
  getMisPermisos
);

router.get(
  "/permisos",
  authMiddleware,
  getPermisosRoles
);

router.put(
  "/permisos/:rol",
  authMiddleware,
  updatePermisosRol
);

export default router;
