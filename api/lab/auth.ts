import { labClient } from "@/api/apiClients";

// Backend JWT exchange for the signed-in Clerk user — see hooks/lab/use-auth-sync.ts.
// The backend verifies the Clerk session token and takes the user id from it.
export const syncUser = async (
  payload: {
    clerkId: string;
    name: string;
    email?: string;
  },
  clerkToken: string
): Promise<string> => {
  const response = await labClient.post("/auth/sync", payload, {
    headers: { Authorization: `Bearer ${clerkToken}` },
  });
  return response.data.data.token;
};
