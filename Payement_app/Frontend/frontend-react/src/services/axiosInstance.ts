// src/api/axiosInstance.ts
import {
  getAccessToken,
  removeAccessToken,
  removeAccessTokenExpiry,
} from "@/utils/tokenUtils";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token if available
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    // Skip setting the Authorization header if the request is for /login
    if (token && !config.url?.includes('/login')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

//  Handle global errors (Response Interceptor)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        removeAccessToken();
        removeAccessTokenExpiry();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      }

      if (error.response.status === 500) {
        console.error("Server error:", error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
