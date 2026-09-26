import bcrypt from "bcryptjs";

import User from "./user.model.js";
import { limpiarSuspensionVencida } from "./userSuspension.js";

const ROL_SUPERUSUARIO = "SUPERUSUARIO";
const ROLES_ACCESO_TOTAL = [ROL_SUPERUSUARIO, "ADMIN"];

const sanitizeUser = (user) => {
  const data =
    typeof user.toObject === "function"
      ? user.toObject()
      : { ...user };

  delete data.password;
  return data;
};

const normalizarRol = (rol) => {
  if (
    [
      "SUPERUSUARIO",
      "ADMIN",
      "INVENTARIO",
      "VENTAS",
      "ASESOR",
    ].includes(rol)
  ) {
    return rol;
  }

  return "INVENTARIO";
};

const esSuperusuario = (user) =>
  user?.rol === ROL_SUPERUSUARIO;

const validarGestionSuperusuario = (currentUser, rol) => {
  if (rol === ROL_SUPERUSUARIO && !esSuperusuario(currentUser)) {
    throw new Error(
      "Solo un superusuario puede gestionar superusuarios"
    );
  }
};

const validarUsuarioGestionable = (currentUser, user) => {
  validarGestionSuperusuario(currentUser, user.rol);

  if (
    !esSuperusuario(currentUser) &&
    user.creadoPor &&
    String(user.creadoPor) !== String(currentUser?._id)
  ) {
    throw new Error(
      "Solo puede gestionar usuarios creados por su cuenta"
    );
  }
};

const validarUsuarioDiferente = (currentUser, user) => {
  if (String(currentUser?._id) === String(user._id)) {
    throw new Error("No puede aplicar esta accion sobre su propia cuenta");
  }
};

export const listarUsuarios = async (currentUser) => {
  const usuarios = await User.find()
    .sort({
      createdAt: -1,
    });

  await Promise.all(
    usuarios.map(async (usuario) => {
      const rolNormalizado = normalizarRol(usuario.rol);

      if (usuario.rol !== rolNormalizado) {
        usuario.rol = rolNormalizado;
        await usuario.save();
      }

      await limpiarSuspensionVencida(usuario);
    })
  );

  return usuarios
    .filter(
      (usuario) =>
        esSuperusuario(currentUser) ||
        usuario.rol !== ROL_SUPERUSUARIO
    )
    .map(sanitizeUser);
};

export const crearUsuarioAdmin = async (data, currentUser) => {
  const exists = await User.findOne({
    correo: data.correo,
  });

  if (exists) {
    throw new Error("Usuario ya existe");
  }

  const rol = normalizarRol(data.rol || "INVENTARIO");
  validarGestionSuperusuario(currentUser, rol);

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const user = await User.create({
    nombre: data.nombre,
    correo: data.correo,
    password: hashedPassword,
    rol,
    creadoPor: currentUser?._id || null,
  });

  return sanitizeUser(user);
};

export const cambiarPasswordUsuario = async (
  id,
  password,
  currentUser
) => {
  const user = await User.findById(id);

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  validarUsuarioGestionable(currentUser, user);
  validarUsuarioDiferente(currentUser, user);

  if (typeof password !== "string" || password.length < 8) {
    throw new Error("La nueva clave debe tener minimo 8 caracteres");
  }

  user.password = await bcrypt.hash(password, 10);
  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  await user.save();

  return sanitizeUser(user);
};

export const actualizarSuspensionUsuario = async (
  id,
  data,
  currentUser
) => {
  const user = await User.findById(id);

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  validarUsuarioGestionable(currentUser, user);
  validarUsuarioDiferente(currentUser, user);

  const modo = String(data?.modo || "").toUpperCase();

  if (modo === "REACTIVAR") {
    user.suspendido = false;
    user.suspensionIndefinida = false;
    user.suspendidoHasta = null;
    user.suspendidoPor = null;
  } else if (modo === "INDEFINIDA") {
    user.suspendido = true;
    user.suspensionIndefinida = true;
    user.suspendidoHasta = null;
    user.suspendidoPor = currentUser?._id || null;
  } else if (modo === "TEMPORAL") {
    const hasta = new Date(data?.hasta);

    if (Number.isNaN(hasta.getTime()) || hasta.getTime() <= Date.now()) {
      throw new Error("Seleccione una fecha y hora futura");
    }

    user.suspendido = true;
    user.suspensionIndefinida = false;
    user.suspendidoHasta = hasta;
    user.suspendidoPor = currentUser?._id || null;
  } else {
    throw new Error("Tipo de suspension no valido");
  }

  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  await user.save();

  return sanitizeUser(user);
};

export const actualizarRolUsuario = async (
  id,
  rol,
  currentUser
) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const rolNormalizado = normalizarRol(rol);

  validarUsuarioGestionable(currentUser, user);
  validarUsuarioDiferente(currentUser, user);
  validarGestionSuperusuario(currentUser, rolNormalizado);

  user.rol = rolNormalizado;
  await user.save();

  return sanitizeUser(user);
};

export const eliminarUsuario = async (id, currentUser) => {
  const user = await User.findById(id);

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  validarUsuarioGestionable(currentUser, user);
  validarUsuarioDiferente(currentUser, user);

  if (ROLES_ACCESO_TOTAL.includes(user.rol)) {
    const totalUsuariosAccesoTotal = await User.countDocuments({
      rol: {
        $in: ROLES_ACCESO_TOTAL,
      },
    });

    if (totalUsuariosAccesoTotal <= 1) {
      throw new Error(
        "No se puede eliminar el ultimo usuario con acceso total"
      );
    }
  }

  await user.deleteOne();

  return {
    message: "Usuario eliminado",
  };
};
