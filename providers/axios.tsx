import axios from "axios";
import { getAuthToken } from "./authToken";

const axiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
    // Harmless when the backend URL isn't a localtunnel host — only matters when it is,
    // to skip localtunnel's anti-abuse interstitial page.
    "bypass-tunnel-reminder": "true",
  },
});

axiosInstance.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
