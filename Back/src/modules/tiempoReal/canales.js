const conexiones = new Map();

export const estaEnLinea = (usuario) => Boolean(conexiones.get(String(usuario))?.size);

function enviar(res, tipo, datos) {
  if (res.destroyed || res.writableEnded) return;
  // Close slow consumers before queued notifications accumulate.
  if (res.writableLength > 65536) { res.destroy(); return; }
  res.write(`event: ${tipo}\ndata: ${JSON.stringify(datos)}\n\n`);
}

export function conectarUsuario(usuario, res) {
  const id = String(usuario);
  const canales = conexiones.get(id) || new Set();
  const primera = canales.size === 0;
  canales.add(res);
  conexiones.set(id, canales);
  enviar(res, "conectado", {});
  return {
    primera,
    desconectar() {
      canales.delete(res);
      if (canales.size) return false;
      if (conexiones.get(id) === canales) conexiones.delete(id);
      return true;
    },
  };
}

export const cantidadConexiones = (usuario) => conexiones.get(String(usuario))?.size || 0;

export function notificarUsuarios(usuarios, tipo, datos) {
  for (const id of new Set(usuarios.map(String))) {
    for (const res of conexiones.get(id) || []) enviar(res, tipo, datos);
  }
}

export function avisarCambioAlertas() {
  // This signal contains no alert data. Each client reloads its authorized inbox.
  for (const canales of conexiones.values()) {
    for (const res of canales) enviar(res, "alertas", {});
  }
}
