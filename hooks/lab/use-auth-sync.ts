import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/expo";
import { syncUser } from "@/api/lab";
import { setAuthToken, clearAuthToken } from "@/providers/labAuthToken";

// Syncs the signed-in Clerk user to the backend and stores the returned backend JWT,
// which labClient (api/apiClients.ts) then attaches to every subsequent request.
export const useAuthSync = () => {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const syncedClerkId = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !user) {
      if (syncedClerkId.current) {
        syncedClerkId.current = null;
        clearAuthToken();
      }
      return;
    }

    if (syncedClerkId.current === user.id) return;

    const sync = async () => {
      try {
        const token = await syncUser({
          clerkId: user.id,
          name: user.fullName || user.username || "Student",
          email: user.primaryEmailAddress?.emailAddress,
        });
        await setAuthToken(token);
        syncedClerkId.current = user.id;
      } catch (error) {
        console.error("[useAuthSync] Failed to sync user:", error);
      }
    };

    sync();
  }, [isSignedIn, user]);
};
