import api from "./axios";

export const getBandejaInventario = () => api.get("/inventario/bandeja");
