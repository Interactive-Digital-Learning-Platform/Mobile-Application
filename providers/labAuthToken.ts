import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "backend_auth_token";

let inMemoryToken: string | null = null;

export const setAuthToken = async (token: string) => {
  inMemoryToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getAuthToken = async (): Promise<string | null> => {
  if (inMemoryToken) return inMemoryToken;
  const stored = await SecureStore.getItemAsync(TOKEN_KEY);
  inMemoryToken = stored;
  return stored;
};

export const clearAuthToken = async () => {
  inMemoryToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};
