import api from "./axios";

export const getMisPermisos = () =>
  api.get("/roles/mis-permisos");

export const getPermisosRoles = () =>
  api.get("/roles/permisos");

export const updatePermisosRol = (rol, permisos) =>
  api.put(`/roles/permisos/${rol}`, {
    permisos,
  });
