import jwt from "jsonwebtoken";
import User from "../modules/users/user.model.js";

const MAX_SESSION_MS =
  8 * 60 * 60 * 1000;

const tokenSuperaDuracionPermitida = (decoded) => {
  if (!decoded?.iat) {
    return true;
  }

  return Date.now() - decoded.iat * 1000 > MAX_SESSION_MS;
};

export const authMiddleware = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Token no proporcionado",
      });
    }

    const token =
      authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Formato de token inválido",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (tokenSuperaDuracionPermitida(decoded)) {
      return res.status(401).json({
        success: false,
        message: "Token expirado",
      });
    }

    const user = await User.findById(
      decoded.id
    ).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado",
    });
  }
};

export const optionalAuthMiddleware = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (tokenSuperaDuracionPermitida(decoded)) {
      return next();
    }

    const user = await User.findById(
      decoded.id
    ).select("-password");

    if (user) {
      req.user = user;
    }

    next();
  } catch {
    next();
  }
};
