import bcrypt from "bcryptjs";

import User from "./user.model.js";

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

const validarGestionSuperusuario = (currentUser, rol) => {
  if (rol === ROL_SUPERUSUARIO && !esSuperusuario(currentUser)) {
    throw new Error(
      "Solo un superusuario puede gestionar superusuarios"
    );
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
  });

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

  validarGestionSuperusuario(currentUser, user.rol);
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

  validarGestionSuperusuario(currentUser, user.rol);

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
