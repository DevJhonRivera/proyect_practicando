import { listarOrdenesTrabajo } from "./ordenTrabajo.service.js";

export const getOrdenesTrabajo = async (req, res) => {
  try { res.json({ success: true, data: await listarOrdenesTrabajo(req.query, req.user) }); }
  catch (error) { res.status(400).json({ message: error.message }); }
};
