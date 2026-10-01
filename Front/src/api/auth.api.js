import api from "./axios";

export const login = (data) =>
  api.post("/auth/login", data, { skipGlobalActivity: true });

export const registerUser = (data) =>
  api.post("/auth/register", data, { skipGlobalActivity: true });
