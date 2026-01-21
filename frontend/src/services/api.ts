import axios from "axios";

const getToken = () => {
  return localStorage.getItem("token");
};

const apiClient = axios.create({
  // Ensure this matches your Vite/Env variable name
  baseURL: import.meta.env.VITE_API_URL + "/api/v1",
});

// Request Interceptor: Adds the token to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Useful for handling 401 (Unauthorized) errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Redirect to login or clear localStorage
      console.error("Token expired or invalid");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
