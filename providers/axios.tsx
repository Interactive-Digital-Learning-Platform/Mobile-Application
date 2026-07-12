import axios from "axios";

const aiAssistantBackendAPI = axios.create({
  baseURL: process.env.EXPO_PUBLIC_AI_ASSISTANT_SERVICE_API,
  headers: {
    "Content-Type": "application/json",
  },
});

export default aiAssistantBackendAPI;
