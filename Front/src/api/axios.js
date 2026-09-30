import axios from "axios";
import {
  cerrarSesion,
  tokenExpirado,
} from "../utils/session";

const api = axios.create({
  baseURL: import.meta.env.DEV
    ? "http://localhost:5001/api"
    : import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
      "https://back-carros.onrender.com/api",
});

api.interceptors.request.use(  (config) => {

    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      if (tokenExpirado(token)) {
        cerrarSesion();

        return Promise.reject(
          new Error("Sesion expirada")
        );
      }

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      cerrarSesion();
    }

    return Promise.reject(error);
  }
);


export default api;
