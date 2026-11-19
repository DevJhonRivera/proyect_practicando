import { Router } from "express";
import User from "./user.model.js";
import { validarRemuneracion } from "./remuneracion.js";
import { requireRole } from "../../middlewares/permission.middleware.js";

import {
  createUsuario,
  deleteUsuario,
  getUsuarios,
  updateUsuarioPassword,
  updateUsuarioRol,
  updateUsuarioSuspension,
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

router.patch(
  "/:id/password",
  authMiddleware,
  requirePermission("usuarios", "write"),
  updateUsuarioPassword
);

router.patch(
  "/:id/suspension",
  authMiddleware,
  requirePermission("usuarios", "write"),
  updateUsuarioSuspension
);

router.delete(
  "/:id",
  authMiddleware,
  requirePermission("usuarios", "delete"),
  deleteUsuario
);

router.patch("/:id/remuneracion", authMiddleware, requireRole("ADMIN", "SUPERUSUARIO"), async (req, res) => {
  try {
    const remuneracion = validarRemuneracion(req.body);
    const user = await User.findOneAndUpdate({ _id: req.params.id, rol: "INSTALADOR" }, { $set: { remuneracion } }, { new: true, runValidators: true }).select("nombre remuneracion");
    if (!user) return res.status(404).json({ message: "Instalador no encontrado" });
    res.json(user);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

export default router;
