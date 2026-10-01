import axios from "axios";
import {
  cerrarSesion,
  getSessionItem,
  tokenExpirado,
} from "../utils/session";
import { finishActivity, startActivity } from "../utils/activityIndicator";

const api = axios.create({
  baseURL: import.meta.env.DEV
    ? "http://localhost:5001/api"
    : import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
      "https://back-carros.onrender.com/api",
});

const mutatingMethods = new Set(["post", "put", "patch", "delete"]);

const finishRequestActivity = (config) => {
  if (config?.activityStarted) {
    config.activityStarted = false;
    finishActivity();
  }
};

api.interceptors.request.use((config) => {

    const token =
      getSessionItem(
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

    if (
      !config.skipGlobalActivity &&
      mutatingMethods.has(String(config.method || "").toLowerCase())
    ) {
      config.activityStarted = true;
      startActivity();
    }

    return config;
  }, (error) => {
    finishRequestActivity(error.config);
    return Promise.reject(error);
  }
);
api.interceptors.response.use(
  (response) => {
    finishRequestActivity(response.config);
    return response;
  },
  (error) => {
    finishRequestActivity(error.config);
    if (error.response?.status === 401) {
      cerrarSesion();
    }

    return Promise.reject(error);
  }
);


export default api;
