import { obtenerCatalogoDisponible } from "./asesor.service.js";

export const getCatalogoDisponible = async (req, res) => {
  try {
    const materiales = await obtenerCatalogoDisponible();
    res.json({ success: true, data: materiales });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
