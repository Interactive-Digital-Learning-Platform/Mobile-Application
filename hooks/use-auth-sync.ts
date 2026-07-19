import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/expo";
import axiosInstance from "@/providers/axios";
import { setAuthToken, clearAuthToken } from "@/providers/authToken";

// Syncs the signed-in Clerk user to the backend and stores the returned backend JWT,
// which providers/axios.tsx then attaches to every subsequent request.
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
        const response = await axiosInstance.post("/api/auth/sync", {
          clerkId: user.id,
          name: user.fullName || user.username || "Student",
          email: user.primaryEmailAddress?.emailAddress,
        });
        await setAuthToken(response.data.data.token);
        syncedClerkId.current = user.id;
      } catch (error) {
        console.error("[useAuthSync] Failed to sync user:", error);
      }
    };

    sync();
  }, [isSignedIn, user]);
};
