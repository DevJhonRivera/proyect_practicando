import {
  actualizarPiezaPpf,
  crearPiezaPpf,
  eliminarPiezaPpf,
  listarPiezasPpf,
} from "./piezaPpf.service.js";

export const getPiezasPpf = async (req, res) => {
  try {
    const piezas =
      await listarPiezasPpf(req.query);

    res.json(piezas);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const createPiezaPpf = async (req, res) => {
  try {
    const pieza =
      await crearPiezaPpf(req.body);

    res.status(201).json(pieza);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const updatePiezaPpf = async (req, res) => {
  try {
    const pieza =
      await actualizarPiezaPpf(
        req.params.id,
        req.body
      );

    res.json(pieza);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const deletePiezaPpf = async (req, res) => {
  try {
    const pieza =
      await eliminarPiezaPpf(req.params.id);

    res.json(pieza);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
