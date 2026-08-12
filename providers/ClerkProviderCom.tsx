import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { PropsWithChildren, useEffect } from "react";
import { setClerkTokenGetter } from "@/api/apiClients";
import { useUserSyncMutation } from "@/hooks/use-quiz";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Missing publishable key!");
}

function ClerkTokenSync() {
  const { getToken } = useAuth();
  const { isLoaded, isSignedIn, user } = useUser();
  const { mutate: syncUser } = useUserSyncMutation();

  useEffect(() => {
    setClerkTokenGetter(() => getToken());
  }, [getToken]);

  // Clerk's session token doesn't carry the username, so once the client-side
  // Clerk profile has loaded, push it to the backend explicitly — this is
  // what actually gets `users.username` populated in the database.
  useEffect(() => {
    if (isLoaded && isSignedIn && user?.username) {
      syncUser(user.username);
    }
  }, [isLoaded, isSignedIn, user?.username]);

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