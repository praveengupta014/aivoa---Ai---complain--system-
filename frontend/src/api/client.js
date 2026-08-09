import axios from "axios";

const isProd = import.meta.env.PROD;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isProd ? "https://aivoa-ai-complain-system-ikzaer9wr.vercel.app" : "http://localhost:8000");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export default api;
