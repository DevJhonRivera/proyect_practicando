import { obtenerBandejaInventario } from "./inventario.service.js";

export const getBandejaInventario = async (req, res) => {
  try {
    res.json({ success: true, data: await obtenerBandejaInventario() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
