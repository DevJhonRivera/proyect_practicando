import api from "./axios";

export const getRetazos = () =>
  api.get("/retazos");

export const getRetazosDisponibles = () =>
  api.get("/retazos/disponibles");

export const getRetazoCompatible = (params) =>
  api.get("/retazos/compatible", {
    params,
  });

export const createRetazo = (data) =>
  api.post("/retazos", data);

export const deleteRetazo = (id) =>
  api.delete(`/retazos/${id}`);
