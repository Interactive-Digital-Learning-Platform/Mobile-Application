import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  type PersistQueryClientOptions,
} from "@tanstack/react-query-persist-client";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

// Offline copy of the user's stats: the Profile tab, Detailed analytics and the Quizzes-tab header render from the
// React Query cache, so saving just those queries to the device lets them show the last known numbers instantly on
// launch / offline, while the normal queries refetch from the database in the background and replace them.

const STORAGE_KEY = "stats-cache";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: STORAGE_KEY, throttleTime: 1000 });

// Only the stats queries are saved -- quiz content, battle history etc. stay in memory only.
function isStatsQuery(key: QueryKey): boolean {
  const [scope, name] = key as readonly unknown[];
  if (scope === "analytics") return true; // me, daily/*, feedback
  if (scope === "user") return name === "me";
  if (scope === "quiz") return name === "sessions";
  if (scope === "battle") return name === "profile";
  return false;
}

let activeUserId: string | null = null;
let unsubscribe: (() => void) | null = null;

function options(queryClient: QueryClient, userId: string): PersistQueryClientOptions {
  return {
    queryClient,
    persister,
    // The saved cache is stamped with its owner's Clerk id; a cache written by a different account is discarded on
    // restore instead of being shown.
    buster: userId,
    maxAge: MAX_AGE_MS,
    dehydrateOptions: {
      // Anything that has data, not just status "success": a failed background refresh flips a query to "error"
      // while it still holds the last good stats, and dropping it then would wipe the saved copy exactly when the
      // backend is unreachable.
      shouldDehydrateQuery: (query) => query.state.data !== undefined && isStatsQuery(query.queryKey),
    },
  };
}

// Load the signed-in user's saved stats into the cache, then keep the saved copy in sync with every update.
export async function attachStatsCache(queryClient: QueryClient, userId: string) {
  if (activeUserId === userId) return;
  detachStatsCache();
  activeUserId = userId;
  const opts = options(queryClient, userId);
  try {
    await persistQueryClientRestore(opts);
  } catch {
    // A corrupt / unreadable cache just means starting from the network as before.
  }
  if (activeUserId !== userId) return; // signed out / switched account while restoring
  unsubscribe = persistQueryClientSubscribe(opts);
}

export function detachStatsCache() {
  unsubscribe?.();
  unsubscribe = null;
  activeUserId = null;
}

// On log-out: stop saving and delete the device copy so the next person on this phone never sees it.
export async function clearStatsCache() {
  detachStatsCache();
  await persister.removeClient();
}
