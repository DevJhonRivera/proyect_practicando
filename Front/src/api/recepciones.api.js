import api from "./axios";

export const getRecepciones =
(params = {}) =>
api.get(
  "/recepcion",
  { params }
);

export const createRecepcion =
(data) =>
api.post(
  "/recepcion",
  data
);

export const clasificarRolloRecepcion =
(id, data) =>
api.post(
  `/recepcion/${id}/rollos`,
  data
);
