import {
  actualizarPermisosRol,
  listarPermisosRoles,
  obtenerPermisosRol,
} from "./rolePermission.service.js";

export const getPermisosRoles = async (req, res) => {
  try {
    const roles = await listarPermisosRoles(req.user);

    res.json(roles);
  } catch (error) {
    res.status(403).json({
      message: error.message,
    });
  }
};

export const getMisPermisos = async (req, res) => {
  try {
    const permisos = await obtenerPermisosRol(req.user?.rol);

    res.json({
      rol: req.user?.rol,
      permisos,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updatePermisosRol = async (req, res) => {
  try {
    const config = await actualizarPermisosRol(
      req.params.rol,
      req.body.permisos,
      req.user
    );

    res.json({
      message: "Permisos actualizados",
      config,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
