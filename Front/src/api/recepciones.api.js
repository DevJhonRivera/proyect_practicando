import api from "./axios";

export const getRecepciones =
() =>
api.get(
  "/recepcion"
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
