import { Router } from "express";
import { obtenerPoliticaDatos } from "./politicaDatos.js";
const router = Router();
router.get("/politica", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try { res.json({ data: obtenerPoliticaDatos() }); }
  catch { res.status(503).json({ message: "La política no está disponible: falta completar la identificación y el contacto del responsable. Comunícate con tu asesor." }); }
});
export default router;
