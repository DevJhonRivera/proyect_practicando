import api from "./axios";

export const getReserva =
() =>
api.get(
  "/rollos/estado/RESERVA"
);

export const getUso =
() =>
api.get(
  "/rollos/estado/USO"
);

export const moverUso =
(id) =>
api.patch(
  `/rollos/${id}/uso`
);

export const cerrarRollo =
(id, data) =>
api.patch(
  `/rollos/${id}/cerrar`,
  data
);

export const getRollos =
  () =>
    api.get("/rollos");
