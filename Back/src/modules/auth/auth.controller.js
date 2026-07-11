import {registerUser,loginUser} from "./auth.service.js";

export const register = async (req,res) => {
  try {
    const user = await registerUser(req.body);

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

    res.json(result);
  } catch (error) {
    res.status(401).json({
      message: error.message
    });
  }
};
