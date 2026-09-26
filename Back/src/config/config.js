import "dotenv/config"

export const PORT= process.env.PORT || 5001;
export const MONGO_URI=process.env.MONGO_URI

export const validateConfig = () => {
  const errors = [];
  const isProduction =
    process.env.NODE_ENV === "production";

  if (!MONGO_URI) {
    errors.push("Falta MONGO_URI");
  }

  if (!process.env.JWT_SECRET) {
    errors.push("Falta JWT_SECRET");
  } else if (
    isProduction &&
    process.env.JWT_SECRET.length < 32
  ) {
    errors.push(
      "JWT_SECRET debe tener al menos 32 caracteres en produccion"
    );
  }

  if (
    isProduction &&
    !String(process.env.CORS_ORIGIN || "").trim()
  ) {
    errors.push(
      "Falta CORS_ORIGIN para autorizar el frontend"
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuracion invalida: ${errors.join(". ")}`
    );
  }
};
