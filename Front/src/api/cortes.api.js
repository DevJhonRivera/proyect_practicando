import api from "./axios";

export const createCorte = (data) =>
  api.post("/cortes",data);

export const createCortesPropuesta = (asesoriaId) =>
  api.post(`/cortes/propuesta/${asesoriaId}`);

export const getCortes = (params = {}) =>
  api.get("/cortes", { params });

export const updateCorte = (id, data) =>
  api.put(`/cortes/${id}`, data);

export const getSugerenciasCortes = ({
  marca,
  modelo,
  tipoCorte,
}) =>
  api.get("/cortes/sugerencias", {
    params: {
      marca,
      modelo,
      tipoCorte,
    },
  });
