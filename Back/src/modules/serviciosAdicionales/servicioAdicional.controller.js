import { crearServicioAdicional, eliminarServicioAdicional, listarServiciosAdicionales } from "./servicioAdicional.service.js";

export const getServiciosAdicionales = async (_req, res) => {
  try { res.json({ success: true, data: await listarServiciosAdicionales() }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
export const createServicioAdicional = async (req, res) => {
  try { res.status(201).json({ success: true, data: await crearServicioAdicional(req.body, req.user) }); }
  catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
export const deleteServicioAdicional = async (req, res) => {
  try { res.json({ success: true, data: await eliminarServicioAdicional(req.params.id) }); }
  catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
