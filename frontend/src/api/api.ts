import axios from "axios";

// Use local backend in development, production backend otherwise
const getBaseURL = () => {
  // Check if we're in development mode (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.') || window.location.hostname.startsWith('172.')) {
    // Use the same hostname but port 5000 for backend
    return `http://${window.location.hostname}:5000/api`;
  }
  return "https://spoonfeeders-backend.vercel.app/api"; // Production backend URL
};

const api = axios.create({
  baseURL: getBaseURL(),
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

// Global response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - clear authentication only, keep caches
            console.log('Token expired or invalid - clearing authentication, preserving caches');
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Keep hierarchy and contentMode for better UX
            // Only redirect to login, don't clear caches since they might be valid
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
