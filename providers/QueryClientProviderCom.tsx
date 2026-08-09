import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { PropsWithChildren, useState } from "react";

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
