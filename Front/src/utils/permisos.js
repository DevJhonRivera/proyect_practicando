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
  ],
  VENTAS: [
    "dashboard:read",
    "ventas:*",
    "cortes:read",
  ],
};

export const guardarPermisosUsuarioActual = (rol, permisos) => {
  localStorage.setItem(
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
      localStorage.getItem("permisosRolActual") ||
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
    return JSON.parse(localStorage.getItem("usuario") || "null");
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
