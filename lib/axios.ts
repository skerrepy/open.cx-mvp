import axios from "axios";

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookies to be sent with requests
});

// Request interceptor (optional - for adding auth tokens if needed later)
axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || error.response.data?.message || "An error occurred";
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Request was made but no response received
      return Promise.reject(new Error("Network error. Please check your connection."));
    } else {
      // Something else happened
      return Promise.reject(error);
    }
  }
);

export default axiosInstance;

