import * as SecureStore from "expo-secure-store";
import axiosInstance from "@/providers/axios";

const TOKEN_KEY = "lab_backend_token";
const USER_KEY = "lab_backend_user";

export const saveToken = async (token: string) => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return "bypass-token-123";
};

export const clearToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
};

export const syncUserWithBackend = async (params: {
  clerkId: string;
  name: string;
  email: string;
  grade?: number;
  school?: string;
}) => {
  const { data } = await axiosInstance.post("/auth/sync", params);
  if (data.success) {
    await saveToken(data.data.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.data.user));
  }
  return data.data;
};

export const getStoredUser = async () => {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (raw) return JSON.parse(raw);
  
  // Return mock user if not signed in (for bypass)
  return {
    clerkId: "mock_clerk_id_123",
    name: "Test User",
    email: "testuser@example.com",
    grade: 8,
    school: "Mock Science School",
    role: "student",
  };
};
