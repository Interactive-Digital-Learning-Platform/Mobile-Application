import { QueryClientProvider, QueryClient, onlineManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { PropsWithChildren, useState } from "react";

// React Query has no network detection on React Native by default. Feeding it NetInfo pauses fetches while offline
// (cached data stays on screen instead of erroring) and refetches stale queries as soon as the connection is back.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  })
);

// Global QueryClient configuration
const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 1 minute default — individual hooks can override
      staleTime: 60 * 1000,
      // Retry failed requests twice before surfacing an error
      retry: 2,
      // Don't refetch just because the window regains focus (mobile UX)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function QueryClientProviderCom({
  children,
}: PropsWithChildren) {
  // useState ensures a single stable instance for the lifetime of the component tree
  const [queryClient] = useState(() => defaultQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
