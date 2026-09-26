import { getCorsOrigins, isProduction } from "../config/security.js";

const loginAttempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const loginAttemptKey = (req) => {
  const forwardedFor = String(
    req.headers["x-forwarded-for"] || ""
  )
    .split(",")[0]
    .trim();
  const ip = req.ip || forwardedFor || "unknown";
  const correo = String(req.body?.correo || "")
    .trim()
    .toLowerCase();

  return `${ip}:${correo || "sin-correo"}`;
};

const activeAttempt = (req) => {
  const key = loginAttemptKey(req);
  const attempt = loginAttempts.get(key);

  if (
    attempt &&
    Date.now() - attempt.firstAttemptAt >= WINDOW_MS
  ) {
    loginAttempts.delete(key);
    return { key, attempt: null };
  }

  return { key, attempt };
};

export const corsOptions = {
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
  origin(origin, callback) {
    const allowed = getCorsOrigins();

    if (!origin) {
      return callback(null, true);
    }

    if (allowed.includes(origin)) {
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

  if (isProduction) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
};

export const loginRateLimiter = (req, res, next) => {
  const { attempt } = activeAttempt(req);

  if (attempt?.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (WINDOW_MS -
          (Date.now() - attempt.firstAttemptAt)) /
          1000
      )
    );

    res.setHeader("Retry-After", retryAfterSeconds);

    return res.status(429).json({
      message:
        "Demasiados intentos fallidos. Espere unos minutos antes de intentar nuevamente.",
      retryAfterSeconds,
    });
  }

  next();
};

export const registrarLoginFallido = (req) => {
  const { key, attempt } = activeAttempt(req);

  loginAttempts.set(key, {
    count: Number(attempt?.count || 0) + 1,
    firstAttemptAt:
      attempt?.firstAttemptAt || Date.now(),
  });
};

export const limpiarIntentosLogin = (req) => {
  loginAttempts.delete(loginAttemptKey(req));
};
