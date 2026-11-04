const destinoPorRol = {
  ASESOR: ["COORDINADOR"],
  INSTALADOR: ["COORDINADOR"],
  COORDINADOR: ["INVENTARIO", "ADMIN"],
};
export const rolesChat = ["ASESOR", "INSTALADOR", "COORDINADOR", "INVENTARIO", "ADMIN", "SUPERUSUARIO"];
export const destinosChat = (rol) => destinoPorRol[rol] || [];
export const puedeIniciarChat = (origen, destino) => destinosChat(origen).includes(destino);
export const puedenConversar = (a, b) => puedeIniciarChat(a, b) || puedeIniciarChat(b, a);

export const alcanceOrdenChat = (usuario) => {
  if (usuario.rol === "ASESOR") return { creadoPor: usuario._id };
  if (usuario.rol === "INSTALADOR") return { "coordinacion.asignaciones.instaladorId": usuario._id };
  if (["COORDINADOR", "INVENTARIO", "ADMIN", "SUPERUSUARIO"].includes(usuario.rol)) return {};
  return { _id: null };
};

export const claveConversacion = (a, b, orden) => [String(a), String(b)].sort().join(":") + ":" + (orden || "general");
