import api from "./axios";

export const getCombosPpf = () => api.get("/combos-ppf");
export const createComboPpf = (data) => api.post("/combos-ppf", data);
export const deleteComboPpf = (id) => api.delete(`/combos-ppf/${id}`);
