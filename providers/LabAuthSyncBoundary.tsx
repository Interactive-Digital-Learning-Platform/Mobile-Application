import { PropsWithChildren } from "react";
import { useAuthSync } from "@/hooks/lab/use-auth-sync";

// Must render inside ClerkProviderCom — useAuthSync depends on Clerk's auth context. This is the
// Lab feature's own required handshake (Clerk sign-in -> POST /api/lab/auth/sync -> backend JWT
// that labClient attaches to every Lab request, see api/apiClients.ts) — not a second auth system.
export default function LabAuthSyncBoundary({ children }: PropsWithChildren) {
  useAuthSync();
  return children;
}
