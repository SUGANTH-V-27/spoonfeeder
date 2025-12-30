import axios from "axios";

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE as string) || "https://spoonfeeder.onrender.com/api", // your backend URL
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token"); // stored after login
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
