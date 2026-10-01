import RolePermission from "./rolePermission.model.js";

export const rolesConfigurables = [
  "ADMIN",
  "INVENTARIO",
  "VENTAS",
  "ASESOR",
  "COORDINADOR",
  "INSTALADOR",
];

export const permisosPorRolBase = {
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
  COORDINADOR: [
    "dashboard:read",
    "coordinacion:*",
    "medidasVehiculos:*",
    "piezasPpf:*",
    "alertas:*",
    "cortes:read",
  ],
  INSTALADOR: [
    "dashboard:read",
    "coordinacion:read",
    "coordinacion:write",
    "alertas:read",
  ],
};

const limpiarPermisos = (permisos = []) =>
  Array.from(
    new Set(
      permisos
        .filter((permiso) => typeof permiso === "string")
        .map((permiso) => permiso.trim())
        .filter(Boolean)
    )
  );

const garantizarInicio = (permisos = []) =>
  Array.from(
    new Set([
      "dashboard:read",
      ...limpiarPermisos(permisos),
    ])
  );

const validarSuperusuario = (currentUser) => {
  if (currentUser?.rol !== "SUPERUSUARIO") {
    throw new Error(
      "Solo un superusuario puede configurar permisos"
    );
  }
};

export const obtenerPermisosRol = async (rol) => {
  if (rol === "SUPERUSUARIO") {
    return ["*"];
  }

  if (!rolesConfigurables.includes(rol)) {
    return [];
  }

  const config = await RolePermission.findOne({ rol });

  return config
    ? garantizarInicio(config.permisos)
    : permisosPorRolBase[rol] || [];
};

export const listarPermisosRoles = async (currentUser) => {
  validarSuperusuario(currentUser);

  const configs = await RolePermission.find({
    rol: {
      $in: rolesConfigurables,
    },
  });

  const configPorRol = new Map(
    configs.map((config) => [config.rol, config.permisos])
  );

  return rolesConfigurables.map((rol) => ({
    rol,
    permisos: configPorRol.has(rol)
      ? garantizarInicio(configPorRol.get(rol))
      : permisosPorRolBase[rol] || [],
  }));
};

export const actualizarPermisosRol = async (
  rol,
  permisos,
  currentUser
) => {
  validarSuperusuario(currentUser);

  if (!rolesConfigurables.includes(rol)) {
    throw new Error("Rol no configurable");
  }

  const permisosLimpios = garantizarInicio(permisos);

  const config = await RolePermission.findOneAndUpdate(
    { rol },
    {
      rol,
      permisos: permisosLimpios,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  return {
    rol: config.rol,
    permisos: config.permisos,
  };
};
