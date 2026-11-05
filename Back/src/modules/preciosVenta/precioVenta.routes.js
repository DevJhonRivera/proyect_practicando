import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireAnyPermission, requireRole } from "../../middlewares/permission.middleware.js";
import { crearPrecioVenta, guardarPrecioVenta, listarPreciosVenta } from "./precioVenta.service.js";

const router = Router();
router.use(authMiddleware);
const accesoConsulta = requireAnyPermission(["asesores", "read"], ["ventas", "read"]);
router.get("/", (req, res, next) => ["ADMIN", "SUPERUSUARIO"].includes(req.user.rol)
  ? next() : accesoConsulta(req, res, next), async (req, res) => {
  try {
    res.json({ success: true, data: await listarPreciosVenta(["ADMIN", "SUPERUSUARIO"].includes(req.user.rol)) });
  } catch {
    res.status(500).json({ message: "No se pudo cargar la lista de precios." });
  }
});
router.post("/", requireRole("ADMIN", "SUPERUSUARIO"), async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await crearPrecioVenta(req.body, req.user) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.put("/:codigo", requireRole("ADMIN", "SUPERUSUARIO"), async (req, res) => {
  try {
    res.json({ success: true, data: await guardarPrecioVenta(req.params.codigo, req.body, req.user) });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});
export default router;
