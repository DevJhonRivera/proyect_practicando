import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      rol: user.rol,
      tokenVersion: Number(user.tokenVersion || 0)
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "8h"
    }
  );
};
