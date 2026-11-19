import { crearComboPpf, eliminarComboPpf, listarCombosPpf } from "./comboPpf.service.js";

export const getCombosPpf = async (_req, res) => {
  try { res.json({ success: true, data: await listarCombosPpf() }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
export const postComboPpf = async (req, res) => {
  try { res.status(201).json({ success: true, data: await crearComboPpf(req.body, req.user) }); }
  catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
export const deleteComboPpf = async (req, res) => {
  try { res.json({ success: true, data: await eliminarComboPpf(req.params.id, req.user) }); }
  catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
