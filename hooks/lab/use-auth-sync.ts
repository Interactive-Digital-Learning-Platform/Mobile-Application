import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/expo";
import { syncUser } from "@/api/lab";
import { setAuthToken, clearAuthToken } from "@/providers/labAuthToken";

const RETRY_DELAY_MS = 5000;

// Syncs the signed-in Clerk user to the backend and stores the returned backend JWT,
// which labClient (api/apiClients.ts) then attaches to every subsequent request.
// Retries until it succeeds, so starting the app before the lab service is up doesn't
// leave every Lab request unauthenticated for the rest of the session.
export const useAuthSync = () => {
  const { isSignedIn, getToken } = useAuth();
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

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const sync = async () => {
      try {
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error("No Clerk session token available");
        const token = await syncUser(
          {
            clerkId: user.id,
            name: user.fullName || user.username || "Student",
            email: user.primaryEmailAddress?.emailAddress,
          },
          clerkToken
        );
        if (cancelled) return;
        await setAuthToken(token);
        syncedClerkId.current = user.id;
      } catch (error) {
        if (cancelled) return;
        console.error("[useAuthSync] Failed to sync user, retrying:", error);
        retryTimer = setTimeout(sync, RETRY_DELAY_MS);
      }
    };

    sync();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [isSignedIn, user, getToken]);
};
