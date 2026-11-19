import "dotenv/config";

const splitList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const allowedOrigins = splitList(process.env.CORS_ORIGIN);

export const isProduction =
  process.env.NODE_ENV === "production";

export const isPublicRegistrationEnabled =
  process.env.PUBLIC_REGISTRATION_ENABLED === "true";

export const defaultDevOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://192.168.1.29:5173",
];

export const getCorsOrigins = () => {
  if (isProduction) {
    return allowedOrigins;
  }

  return [...new Set([...allowedOrigins, ...defaultDevOrigins])];
};
