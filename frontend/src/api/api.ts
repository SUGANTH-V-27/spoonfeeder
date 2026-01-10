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
            // Token expired or invalid - clear authentication and redirect
            console.log('Token expired or invalid - clearing all caches, logging out user');
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            localStorage.removeItem('hierarchy');
            localStorage.removeItem('contentMode');

            try{
                const keysTORemove: string[] =[];
                for(let i=0;i<sessionStorage.length;i++){
                    const key = sessionStorage.key(i);
                    if(key && (key.startsWith('content_cache_') || key.startsWith('topics_cache_') || key.startsWith('subtopics_cache_'))){
                        keysTORemove.push(key);
                    }
                }
                keysTORemove.forEach(key => sessionStorage.removeItem(key));
            } catch (error) {
                console.error('Error clearing caches:', error);
            }
            // Redirect to login page
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
