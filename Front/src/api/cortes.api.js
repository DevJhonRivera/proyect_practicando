import api from "./axios";

export const createCorte = (data) =>
  api.post("/cortes",data);

export const getCortes = () =>
  api.get("/cortes");

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
