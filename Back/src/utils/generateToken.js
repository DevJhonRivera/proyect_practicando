import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      rol: user.rol
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
};