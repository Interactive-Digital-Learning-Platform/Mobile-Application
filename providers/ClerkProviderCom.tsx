import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { resourceCache } from "@clerk/expo/resource-cache";
import { PropsWithChildren, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { markClerkReady, setClerkTokenGetter } from "@/api/apiClients";
import { useUserSyncMutation } from "@/hooks/use-quiz";
import { attachStatsCache, detachStatsCache } from "@/providers/statsCache";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Missing publishable key!");
}

function ClerkTokenSync() {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { mutate: syncUser } = useUserSyncMutation();

  useEffect(() => {
    setClerkTokenGetter(() => getToken());
  }, [getToken]);

  // Gate on useAuth()'s isLoaded (just "has the session check finished"),
  // not useUser()'s — that one also waits on a full profile fetch, which is
  // slower and has its own failure modes, and we only actually need a token.
  useEffect(() => {
    if (authLoaded) markClerkReady();
  }, [authLoaded]);

  // Clerk's session token doesn't carry the username, so once the client-side
  // Clerk profile has loaded, push it to the backend explicitly — this is
  // what actually gets `users.username` populated in the database.
  useEffect(() => {
    if (userLoaded && isSignedIn && user?.username) {
      syncUser(user.username);
    }
  }, [userLoaded, isSignedIn, user?.username]);

  return null;
}

// Restores the signed-in user's saved stats (see statsCache) once Clerk knows who they are.
function StatsCacheSync() {
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoaded) return;
    if (userId) attachStatsCache(queryClient, userId);
    else detachStatsCache();
  }, [isLoaded, userId, queryClient]);

  return null;
}

export default function ClerkProviderCom({ children }: PropsWithChildren) {
  // resourceCache lets Clerk start from its last known session when offline -- without it the app can't get past
  // the entry screen with no connection, so the saved stats would never be reachable.
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} __experimental_resourceCache={resourceCache}>
      <ClerkTokenSync />
      <StatsCacheSync />
      {children}
    </ClerkProvider>
  );
}