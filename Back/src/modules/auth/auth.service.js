import bcrypt from "bcryptjs";

import User from "../users/user.model.js";

import { generateToken } from "../../utils/generateToken.js";

const sanitizeUser = (user) => {
  const safeUser = user.toObject();
  delete safeUser.password;

  return safeUser;
};

export const registerUser = async (data) => {
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

  const user = await User.create({
    nombre: data.nombre,
    correo: data.correo,
    password: hashedPassword,
    rol: "OPERARIO"
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

  return {
    user: sanitizeUser(user),
    token: generateToken(user)
  };
};
