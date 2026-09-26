import api from "./axios";

export const getCatalogoDisponible = () =>
  api.get("/asesores/materiales");
