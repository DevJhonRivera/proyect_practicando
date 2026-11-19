export const rolesChat = ["ASESOR", "INSTALADOR", "COORDINADOR", "INVENTARIO", "VENTAS", "ADMIN"];
export const destinosChat = (rol) => rolesChat.includes(rol) ? rolesChat : [];
export const puedeIniciarChat = (origen, destino) => destinosChat(origen).includes(destino);
export const puedenConversar = (a, b) => puedeIniciarChat(a, b) || puedeIniciarChat(b, a);

export const alcanceOrdenChat = (usuario) => {
  if (usuario.rol === "ASESOR") return { creadoPor: usuario._id };
  if (usuario.rol === "INSTALADOR") return { "coordinacion.asignaciones.instaladorId": usuario._id };
  if (["COORDINADOR", "INVENTARIO", "VENTAS", "ADMIN"].includes(usuario.rol)) return {};
  return { _id: null };
};

export const claveConversacion = (a, b, orden) => [String(a), String(b)].sort().join(":") + ":" + (orden || "general");
