import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { responderDocumento, gestionarRespuestaCliente, consultarDocumento, emitirDocumento, firmarDocumento, guardarDiagnostico, consultarFotosServicio } from "./autorizaciones.service.js";

const router = Router();
const intentos = new Map();
const limitar = (req, res, next) => {
  const ahora = Date.now();
  for (const [key, item] of intentos) if (item.hasta <= ahora) intentos.delete(key);
  const key = req.ip || "desconocido";
  const item = intentos.get(key) || { cantidad: 0, hasta: ahora + 60000 };
  if (item.cantidad >= 30 || (!intentos.has(key) && intentos.size >= 10000)) return res.status(429).json({ message: "Demasiadas solicitudes. Espere un minuto" });
  item.cantidad++; intentos.set(key, item); next();
};
router.use((req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
router.post("/servicios/:id/documentos", authMiddleware, requirePermission("asesores", "write"), async (req, res) => {
  try { res.status(201).json({ data: await emitirDocumento(req.params.id, req.body.tipo, req.user) }); }
  catch (error) { res.status(400).json({ message: error.message }); }
});
router.get("/servicios/:id/fotos", authMiddleware, requirePermission("asesores", "read"), async (req, res) => {
  try { res.json({ data: await consultarFotosServicio(req.params.id, req.query.documentoId, req.user) }); }
  catch (error) { res.status(400).json({ message: error.message }); }
});
router.put("/servicios/:id/diagnostico", authMiddleware, requirePermission("asesores", "write"), async (req, res) => {
  try { res.json({ data: await guardarDiagnostico(req.params.id, req.body, req.user) }); }
  catch (error) { res.status(400).json({ message: error.message }); }
});
router.post("/consultar", limitar, async (req, res) => {
  try { res.json({ data: await consultarDocumento(req.body.token) }); }
  catch (error) { res.status(400).json({ message: error.message }); }
});
router.post("/firmar", limitar, async (req, res) => {
  try { res.json({ data: await firmarDocumento(req.body.token, req.body, { ip: req.ip, agente: req.get("user-agent") }) }); }
  catch (error) { res.status(400).json({ message: error.message }); }
});
router.post("/responder", limitar, async (req, res) => {
  try { res.json({ data: await responderDocumento(req.body.token, req.body, { ip: req.ip, agente: req.get("user-agent") }) }); }
  catch (error) { res.status(400).json({ message: error.message }); }
});
router.post("/servicios/:id/respuesta", authMiddleware, requirePermission("asesores", "write"), async (req, res) => {
  try { res.json({ data: await gestionarRespuestaCliente(req.params.id, req.body, req.user) }); }
  catch (error) { res.status(400).json({ message: error.message }); }
});
export default router;
