import api from "./axios";

export const getUsuarios = () => api.get("/usuarios");

export const createUsuario = (data) =>
  api.post("/usuarios", data);

export const updateUsuarioRol = (id, rol) =>
  api.patch(`/usuarios/${id}/rol`, { rol });

export const updateUsuarioPassword = (id, password) =>
  api.patch(`/usuarios/${id}/password`, { password });

export const updateUsuarioSuspension = (id, data) =>
  api.patch(`/usuarios/${id}/suspension`, data);

export const deleteUsuario = (id) =>
  api.delete(`/usuarios/${id}`);
