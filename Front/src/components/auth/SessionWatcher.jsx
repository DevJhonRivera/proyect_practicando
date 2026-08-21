import { useEffect } from "react";

import {
  cerrarSesion,
  getTokenExpirationMs,
} from "../../utils/session";

const MAX_TIMEOUT_MS = 2147483647;

function SessionWatcher() {
  useEffect(() => {
    let timeoutId;
    let intervalId;

    const limpiarTimers = () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };

    const revisarSesion = () => {
      limpiarTimers();

      const token =
        localStorage.getItem("token");

      if (!token) {
        return;
      }

      const expirationMs =
        getTokenExpirationMs(token);

      if (
        !expirationMs ||
        Date.now() >= expirationMs
      ) {
        cerrarSesion();
        return;
      }

      const msRestantes =
        expirationMs - Date.now();

      timeoutId = window.setTimeout(
        () => cerrarSesion(),
        Math.min(msRestantes, MAX_TIMEOUT_MS)
      );

      intervalId = window.setInterval(() => {
        const tokenActual =
          localStorage.getItem("token");
        const expActual =
          getTokenExpirationMs(tokenActual);

        if (
          tokenActual &&
          (!expActual || Date.now() >= expActual)
        ) {
          cerrarSesion();
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
