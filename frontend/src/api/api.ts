import axios from "axios";

const api = axios.create({
  baseURL: "https://spoonfeeders-backend.vercel.app/api", // Vercel backend URL
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
