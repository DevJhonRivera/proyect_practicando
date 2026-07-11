export const roleMiddleware =
  (...rolesPermitidos) =>
  (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "No autenticado",
        });
      }

      if (
        !rolesPermitidos.includes(
          req.user.rol
        )
      ) {
        return res.status(403).json({
          message:
            "No tienes permisos para realizar esta acción",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };