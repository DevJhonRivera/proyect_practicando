import api from "./axios";

export const getUsuarios = () => api.get("/usuarios");

export const createUsuario = (data) =>
  api.post("/usuarios", data);

export const updateUsuarioRol = (id, rol) =>
  api.patch(`/usuarios/${id}/rol`, { rol });

export const deleteUsuario = (id) =>
  api.delete(`/usuarios/${id}`);
