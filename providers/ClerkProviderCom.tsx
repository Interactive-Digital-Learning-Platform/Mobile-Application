import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { PropsWithChildren } from "react";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const bypassAuth = process.env.EXPO_PUBLIC_BYPASS_AUTH === "true";

export default function ClerkProviderCom({ children }: PropsWithChildren) {
  if (bypassAuth || !publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}
