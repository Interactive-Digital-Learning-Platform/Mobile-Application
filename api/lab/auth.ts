import { labClient } from "@/api/apiClients";

// Backend JWT exchange for the signed-in Clerk user — see hooks/lab/use-auth-sync.ts.
export const syncUser = async (payload: {
  clerkId: string;
  name: string;
  email?: string;
}): Promise<string> => {
  const response = await labClient.post("/auth/sync", payload);
  return response.data.data.token;
};
