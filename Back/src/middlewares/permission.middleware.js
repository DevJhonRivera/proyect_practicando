import {
  obtenerPermisosRol,
  permisosPorRolBase,
} from "../modules/roles/rolePermission.service.js";

const hasPermission = async (rol, modulo, accion) => {
  if (rol === "SUPERUSUARIO") {
    return true;
  }

  const permissions = await obtenerPermisosRol(rol);
  const permission = `${modulo}:${accion}`;

  return (
    permissions.includes("*") ||
    permissions.includes(permission) ||
    permissions.includes(`${modulo}:*`)
  );
};

export const requirePermission =
  (modulo, accion = "read") =>
  async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "No autenticado",
      });
    }

    if (req.user.rol === "SUPERUSUARIO") {
      return next();
    }

    const permitido = await hasPermission(
      req.user.rol,
      modulo,
      accion
    );

    if (!permitido) {
      return res.status(403).json({
        message:
          "No tienes permisos para realizar esta accion",
      });
    }

    next();
  };

export { permisosPorRolBase as rolePermissions };
