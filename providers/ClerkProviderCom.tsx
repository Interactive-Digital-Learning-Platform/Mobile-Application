import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { PropsWithChildren, useEffect } from "react";
import { markClerkReady, setClerkTokenGetter } from "@/api/apiClients";
import { useUserSyncMutation } from "@/hooks/use-quiz";

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

export default function ClerkProviderCom({ children }: PropsWithChildren) {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkTokenSync />
      {children}
    </ClerkProvider>
  );
}