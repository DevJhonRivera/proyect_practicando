import { useEffect } from "react";

import {
  cerrarSesion,
  getSessionItem,
  getTokenExpirationMs,
} from "../../utils/session";

const MAX_TIMEOUT_MS = 2147483647;

function SessionWatcher() {
  useEffect(() => {
    let timeoutId;
    let intervalId;
    // A customer signing a document does not need an employee session.
    const cerrarSesionActual = () => cerrarSesion({ redirect: !["/firmar", "/politica-de-datos"].includes(window.location.pathname) });

    const limpiarTimers = () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };

    const revisarSesion = () => {
      limpiarTimers();

      const token =
        getSessionItem("token");

      if (!token) {
        return;
      }

      const expirationMs =
        getTokenExpirationMs(token);

      if (
        !expirationMs ||
        Date.now() >= expirationMs
      ) {
        cerrarSesionActual();
        return;
      }

      const msRestantes =
        expirationMs - Date.now();

      timeoutId = window.setTimeout(
        () => cerrarSesionActual(),
        Math.min(msRestantes, MAX_TIMEOUT_MS)
      );

      intervalId = window.setInterval(() => {
        const tokenActual =
          getSessionItem("token");
        const expActual =
          getTokenExpirationMs(tokenActual);

        if (
          tokenActual &&
          (!expActual || Date.now() >= expActual)
        ) {
          cerrarSesionActual();
        }
      }, 30000);
    };

    revisarSesion();

    window.addEventListener(
      "focus",
      revisarSesion
    );
    window.addEventListener(
      "storage",
      revisarSesion
    );
    window.addEventListener(
      "polarizados-session-updated",
      revisarSesion
    );

    return () => {
      limpiarTimers();
      window.removeEventListener(
        "focus",
        revisarSesion
      );
      window.removeEventListener(
        "storage",
        revisarSesion
      );
      window.removeEventListener(
        "polarizados-session-updated",
        revisarSesion
      );
    };
  }, []);

  return null;
}

export default SessionWatcher;
