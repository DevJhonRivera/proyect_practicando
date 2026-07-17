import bcrypt from "bcryptjs";

import User from "../users/user.model.js";

import { generateToken } from "../../utils/generateToken.js";
import { isPublicRegistrationEnabled } from "../../config/security.js";
import { obtenerPermisosRol } from "../roles/rolePermission.service.js";

const ROL_SUPERUSUARIO = "SUPERUSUARIO";

const sanitizeUser = (user) => {
  const safeUser = user.toObject();
  delete safeUser.password;

  return safeUser;
};

const normalizarRol = (rol) => {
  if (
    [
      "SUPERUSUARIO",
      "ADMIN",
      "INVENTARIO",
      "VENTAS",
    ].includes(rol)
  ) {
    return rol;
  }

  if (rol === "ASESOR") {
    return "VENTAS";
  }

  return "INVENTARIO";
};

const esSuperusuario = (user) =>
  user?.rol === ROL_SUPERUSUARIO;

export const registerUser = async (data, currentUser) => {
  const totalUsers = await User.countDocuments();
  const isFirstUser = totalUsers === 0;
  const canManageUsers =
    currentUser &&
    ["SUPERUSUARIO", "ADMIN"].includes(currentUser.rol);

  if (
    !isFirstUser &&
    !canManageUsers &&
    !isPublicRegistrationEnabled
  ) {
    throw new Error(
      "El registro publico esta cerrado. Solicite la creacion del usuario a un administrador."
    );
  }

  const exists = await User.findOne({
    correo: data.correo
  });

  if (exists) {
    throw new Error("Usuario ya existe");
  }

  const hashedPassword = await bcrypt.hash(
    data.password,
    10
  );

  const rol =
    isFirstUser
      ? "ADMIN"
      : canManageUsers
        ? normalizarRol(data.rol || "INVENTARIO")
        : "INVENTARIO";

  if (rol === ROL_SUPERUSUARIO && !esSuperusuario(currentUser)) {
    throw new Error(
      "Solo un superusuario puede crear superusuarios"
    );
  }

  const user = await User.create({
    nombre: data.nombre,
    correo: data.correo,
    password: hashedPassword,
    rol
  });

  return sanitizeUser(user);
};

export const loginUser = async (correo,password) => {
  const user = await User.findOne({ correo });

  if (!user) {
    throw new Error("Credenciales inválidas");
  }

  const match = await bcrypt.compare(
    password,
    user.password
  );

  if (!match) {
    throw new Error("Credenciales inválidas");
  }

  const rolNormalizado = normalizarRol(user.rol);

  if (user.rol !== rolNormalizado) {
    user.rol = rolNormalizado;
    await user.save();
  }

  return {
    user: sanitizeUser(user),
    token: generateToken(user),
    permisos: await obtenerPermisosRol(user.rol),
  };
};
