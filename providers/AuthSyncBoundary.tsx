import { PropsWithChildren } from "react";
import { useAuthSync } from "@/hooks/use-auth-sync";

// Must render inside ClerkProviderCom — useAuthSync depends on Clerk's auth context.
export default function AuthSyncBoundary({ children }: PropsWithChildren) {
  useAuthSync();
  return children;
}
