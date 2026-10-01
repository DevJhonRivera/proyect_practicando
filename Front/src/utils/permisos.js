import { getSessionItem, setSessionItem } from "./session";

export const permisosPorRolBase = {
  SUPERUSUARIO: ["*"],
  ADMIN: ["*"],
  INVENTARIO: [
    "dashboard:read",
    "pedidos:*",
    "recepciones:*",
    "rollos:*",
    "retazos:*",
    "alertas:*",
    "cortes:*",
    "piezasPpf:*",
    "coordinacion:*",
  ],
  VENTAS: [
    "dashboard:read",
    "ventas:*",
    "cortes:read",
    "coordinacion:read",
    "alertas:*",
  ],
  ASESOR: [
    "dashboard:read",
    "asesores:*",
    "cortes:read",
    "piezasPpf:read",
  ],
  COORDINADOR: ["dashboard:read", "coordinacion:*", "medidasVehiculos:*", "piezasPpf:*", "alertas:*", "cortes:read"],
  INSTALADOR: ["dashboard:read", "coordinacion:read", "coordinacion:write", "alertas:read"],
};

export const guardarPermisosUsuarioActual = (rol, permisos) => {
  setSessionItem(
    "permisosRolActual",
    JSON.stringify({
      rol,
      permisos,
    })
  );
};

const obtenerPermisosUsuarioActual = (rol) => {
  try {
    const config = JSON.parse(
      getSessionItem("permisosRolActual") ||
        "null"
    );

    if (config?.rol === rol && Array.isArray(config.permisos)) {
      return config.permisos;
    }
  } catch {
    return null;
  }

  return null;
};

export const obtenerUsuarioActual = () => {
  try {
    return JSON.parse(getSessionItem("usuario") || "null");
  } catch {
    return null;
  }
};

export const tienePermiso = (
  usuario,
  modulo,
  accion = "read"
) => {
  if (usuario?.rol === "SUPERUSUARIO") {
    return true;
  }

  const permisos =
    obtenerPermisosUsuarioActual(usuario?.rol) ||
    permisosPorRolBase[usuario?.rol] ||
    [];
  const permiso = `${modulo}:${accion}`;

  return (
    permisos.includes("*") ||
    permisos.includes(permiso) ||
    permisos.includes(`${modulo}:*`)
  );
};
