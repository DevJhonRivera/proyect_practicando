import {
  buscarClienteAsesoria,
  crearBorradorAsesoria,
  listarAsesorias,
  obtenerCatalogoDisponible,
  obtenerAsesoriaPorId,
  enviarAsesoriaAVentas,
  actualizarAsesoria,
} from "./asesor.service.js";

export const updateAsesoria = async (req, res) => {
  try {
    res.json({
      success: true,
      data: await actualizarAsesoria(req.params.id, req.body, req.user),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const sendAsesoriaToSales = async (req, res) => {
  try {
    res.json({ success: true, data: await enviarAsesoriaAVentas(req.params.id) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAsesoriaPorId = async (req, res) => {
  try {
    res.json({ success: true, data: await obtenerAsesoriaPorId(req.params.id) });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

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

export const getAsesorias = async (req, res) => {
  try {
    const resultado = await listarAsesorias(req.query, req.user);
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const createBorradorAsesoria = async (req, res) => {
  try {
    const asesoria = await crearBorradorAsesoria(req.body, req.user);
    res.status(201).json({
      message: "Datos de recepción guardados",
      data: asesoria,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getClienteAsesoria = async (req, res) => {
  try {
    const resultado = await buscarClienteAsesoria(req.params.cedula);
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
