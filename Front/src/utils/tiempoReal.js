import api from "../api/axios";
import { getSessionItem } from "./session";

let conectado = false;
let generacion = 0;

export function iniciarEventos() {
  const id = ++generacion;
  let activo = true;
  let control;
  let reintento;
  let espera = 1000;

  const conectar = async () => {
    const token = getSessionItem("token");
    if (!activo || !token) return;
    control = new AbortController();
    let pulso;
    const vigilar = () => {
      clearTimeout(pulso);
      pulso = setTimeout(() => control.abort(), 40000);
    };
    let reanudar = true;
    try {
      vigilar();
      const respuesta = await fetch(`${api.defaults.baseURL}/eventos`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
        cache: "no-store",
        signal: control.signal,
      });
      if (respuesta.status === 401 || respuesta.status === 403) { reanudar = false; return; }
      if (!respuesta.ok || !respuesta.body || !respuesta.headers.get("content-type")?.startsWith("text/event-stream")) return;
      const lector = respuesta.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (activo) {
          const { done, value } = await lector.read();
          if (done) break;
          vigilar();
          buffer += decoder.decode(value, { stream: true });
          let fin;
          while ((fin = buffer.indexOf("\n\n")) !== -1) {
            const bloque = buffer.slice(0, fin);
            buffer = buffer.slice(fin + 2);
            const tipo = bloque.match(/^event: ([a-z-]+)$/m)?.[1];
            const datos = bloque.match(/^data: (.+)$/m)?.[1];
            if (!tipo || !datos) continue;
            if (tipo === "conectado") { conectado = true; espera = 1000; }
            window.dispatchEvent(new CustomEvent(`realtime:${tipo}`, { detail: JSON.parse(datos) }));
          }
          if (buffer.length > 65536) break;
        }
      } finally { await lector.cancel().catch(() => {}); }
    } catch {
      // The REST refresh continues while the event connection is unavailable.
    } finally {
      clearTimeout(pulso);
      if (id === generacion) conectado = false;
      if (activo && reanudar) {
        reintento = setTimeout(conectar, espera);
        espera = Math.min(espera * 2, 15000);
      }
    }
  };
  conectar();
  return () => {
    activo = false;
    if (id === generacion) conectado = false;
    control?.abort();
    clearTimeout(reintento);
  };
}

export function observarActualizaciones(eventos, cargar, intervalo, aceptar = () => true) {
  let activo = true;
  let ocupado = false;
  let pendiente = false;
  let ultimaConsulta = 0;
  const actualizar = async (evento) => {
    if (!activo || document.hidden || (evento && !aceptar(evento))) return;
    if (ocupado) { pendiente = true; return; }
    ocupado = true;
    ultimaConsulta = Date.now();
    try { await cargar(); }
    finally {
      ocupado = false;
      if (pendiente) { pendiente = false; actualizar(); }
    }
  };
  const nombres = [...eventos, "realtime:conectado", "focus"];
  nombres.forEach((nombre) => window.addEventListener(nombre, actualizar));
  document.addEventListener("visibilitychange", actualizar);
  const respaldo = setInterval(() => {
    if (!conectado || Date.now() - ultimaConsulta >= 60000) actualizar();
  }, intervalo);
  actualizar();
  return () => {
    activo = false;
    clearInterval(respaldo);
    nombres.forEach((nombre) => window.removeEventListener(nombre, actualizar));
    document.removeEventListener("visibilitychange", actualizar);
  };
}
