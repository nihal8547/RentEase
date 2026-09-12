import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rentease_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 (Unauthorized) or 403 (Forbidden due to stale RBAC)
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('rentease_refresh_token');
      
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
          
          localStorage.setItem('rentease_token', data.accessToken);
          localStorage.setItem('rentease_refresh_token', data.refreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token is invalid/expired
          localStorage.removeItem('rentease_token');
          localStorage.removeItem('rentease_refresh_token');
          localStorage.removeItem('rentease_user');
          localStorage.removeItem('rentease_agency');
          
          const path = window.location.pathname;
          if (path !== '/login' && !path.startsWith('/portal') && !path.startsWith('/accept-invite')) {
            window.location.href = '/login?expired=true';
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, force logout
        localStorage.removeItem('rentease_token');
        localStorage.removeItem('rentease_user');
        localStorage.removeItem('rentease_agency');
        const path = window.location.pathname;
        if (path !== '/login' && !path.startsWith('/portal') && !path.startsWith('/accept-invite')) {
          window.location.href = '/login?expired=true';
        }
      }
    } else if (error.response?.status >= 500) {
      if (error.config?.method === 'get') {
        window.location.href = '/500';
      } else {
        toast.error('Internal Server Error. Please try again later.');
      }
    } else if (error.config?.method !== 'get' && error.response?.status !== 401 && error.response?.status !== 403) {
      // Toast normal API errors, but avoid toasting 401/403 loops
      const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
      if (typeof message === 'string') {
        toast.error(message);
      } else if (Array.isArray(message)) {
        toast.error(message[0]);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
