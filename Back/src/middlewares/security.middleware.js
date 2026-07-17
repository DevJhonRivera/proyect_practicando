import { getCorsOrigins, isProduction } from "../config/security.js";

const loginAttempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const corsOptions = {
  origin(origin, callback) {
    const allowed = getCorsOrigins();

    if (!origin && !isProduction) {
      return callback(null, true);
    }

    if (allowed.includes(origin)) {
      return callback(null, true);
    }
    if (!origin) {
  return callback(null, true);
}

    return callback(new Error("Origen no permitido por CORS"));
  },
};

export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  next();
};

export const loginRateLimiter = (req, res, next) => {
  const key =
    req.ip || req.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const current =
    loginAttempts.get(key) || {
      count: 0,
      firstAttemptAt: now,
    };

  if (now - current.firstAttemptAt > WINDOW_MS) {
    loginAttempts.set(key, {
      count: 1,
      firstAttemptAt: now,
    });
    return next();
  }

  if (current.count >= MAX_ATTEMPTS) {
    return res.status(429).json({
      message:
        "Demasiados intentos de inicio de sesion. Intente nuevamente en unos minutos.",
    });
  }

  current.count += 1;
  loginAttempts.set(key, current);

  next();
};
