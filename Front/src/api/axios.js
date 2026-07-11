import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    // "http://localhost:5001/api",
    "http://192.168.1.29:5001/api",

});

api.interceptors.request.use(  (config) => {

    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);


export default api;
