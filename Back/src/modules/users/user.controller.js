import {
  actualizarRolUsuario,
  crearUsuarioAdmin,
  eliminarUsuario,
  listarUsuarios,
} from "./user.service.js";

export const getUsuarios = async (req, res) => {
  try {
    const usuarios = await listarUsuarios(req.user);

    res.json(usuarios);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const createUsuario = async (req, res) => {
  try {
    const user = await crearUsuarioAdmin(req.body, req.user);

    res.status(201).json({
      message: "Usuario creado correctamente",
      user,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const updateUsuarioRol = async (req, res) => {
  try {
    const user = await actualizarRolUsuario(
      req.params.id,
      req.body.rol,
      req.user
    );

    res.json({
      message: "Rol actualizado",
      user,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const deleteUsuario = async (req, res) => {
  try {
    const result = await eliminarUsuario(
      req.params.id,
      req.user
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
