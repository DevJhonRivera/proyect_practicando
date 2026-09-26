import {registerUser,loginUser} from "./auth.service.js";
import {
  limpiarIntentosLogin,
  registrarLoginFallido,
} from "../../middlewares/security.middleware.js";

export const register = async (req,res) => {
  try {
    const user = await registerUser(req.body, req.user);

    res.status(201).json({message:"Usuario registrado exitosamente...",user});
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};

export const login = async (req,res) => {
  try {
    const { correo, password } = req.body;

    const result = await loginUser(
      correo,
      password
    );

    limpiarIntentosLogin(req);

    res.setHeader("Cache-Control", "no-store");
    res.json(result);
  } catch (error) {
    registrarLoginFallido(req);

    res.status(401).json({
      message: error.message
    });
  }
};
