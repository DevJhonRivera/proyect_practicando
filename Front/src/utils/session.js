const SESSION_KEYS = [
  "token",
  "usuario",
  "permisosRolActual",
];

export const getSessionItem = (key) => {
  const actual = sessionStorage.getItem(key);
  if (actual !== null) return actual;
  const legacy = localStorage.getItem(key);
  if (legacy !== null) {
    sessionStorage.setItem(key, legacy);
    localStorage.removeItem(key);
  }
  return legacy;
};

export const setSessionItem = (key, value) => {
  sessionStorage.setItem(key, value);
  localStorage.removeItem(key);
};

const MAX_SESSION_MS =
  8 * 60 * 60 * 1000;

const decodeBase64Url = (value) => {
  const base64 =
    value.replace(/-/g, "+").replace(/_/g, "/");
  const padded =
    base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

  return atob(padded);
};

export const getTokenPayload = (token) => {
  try {
    const payload = token?.split(".")?.[1];

    if (!payload) {
      return null;
    }

    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
};

export const getTokenExpirationMs = (token) => {
  const payload = getTokenPayload(token);
  const expiracionJwt =
    payload?.exp
      ? payload.exp * 1000
      : null;
  const expiracionPorDuracion =
    payload?.iat
      ? payload.iat * 1000 + MAX_SESSION_MS
      : null;

  if (expiracionJwt && expiracionPorDuracion) {
    return Math.min(
      expiracionJwt,
      expiracionPorDuracion
    );
  }

  return expiracionJwt || expiracionPorDuracion;
};

export const tokenExpirado = (token) => {
  const expirationMs = getTokenExpirationMs(token);

  return !expirationMs || Date.now() >= expirationMs;
};

export const limpiarSesion = () => {
  SESSION_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};

export const cerrarSesion = ({
  redirect = true,
} = {}) => {
  limpiarSesion();

  if (
    redirect &&
    window.location.pathname !== "/login"
  ) {
    window.location.replace("/login");
  }
};

export const notificarSesionActualizada = () => {
  window.dispatchEvent(
    new Event("polarizados-session-updated")
  );
};
