import { create } from "axios";
import { getAuthToken } from "@/providers/labAuthToken";


export const API_GATEWAY_URL = (
  process.env.EXPO_PUBLIC_API_GATEWAY_URL || ""
).replace(/\/$/, "");

export const SERVICE_URLS = {
  assistant: `${API_GATEWAY_URL}/api/assistant`,
  notes: `${API_GATEWAY_URL}/api/notes`,
  quiz: `${API_GATEWAY_URL}/api/quiz`,
  pdf: `${API_GATEWAY_URL}/api/pdf`,
  lab: `${API_GATEWAY_URL}/api/lab`,
  // Online 1v1 battle mode -- its own microservice (Quiz-Battle-Service),
  // reached through the gateway the same way as every other service.
  battle: `${API_GATEWAY_URL}/api/battle`,
} as const;

export const assistantClient = create({
  baseURL: SERVICE_URLS.assistant,
  headers: {
    "Content-Type": "application/json",
  },
});

// The notes service defines its own /api prefix behind the gateway prefix.
export const notesClient = create({
  baseURL: `${SERVICE_URLS.notes}/api`,
  timeout: 60000,
});

export const notesAssetsClient = create({
  baseURL: SERVICE_URLS.notes,
  timeout: 10000,
});

// Proxied through the gateway at /api/quiz, same as the other services —
// nginx strips that prefix and forwards the rest to the backend's own
// /api/v1/* routes (see Deployment-Infrastructure/nginx.conf).
export const quizClient = create({
  baseURL: `${SERVICE_URLS.quiz}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  // AI generation retries transient Groq errors (429/5xx) at two levels —
  // the groq SDK's own internal retry (honors Retry-After, seen waiting 27s
  // for a single attempt) and groq_service.py's own wrapper retry on top of
  // that — so a rate-limited request can legitimately take 60-90s+ to
  // finish. A shorter client timeout used to abort and show a false
  // failure while the backend kept going and committed a real QuizSession
  // anyway, so this needs to comfortably outlast that worst case rather
  // than the old "typical case" 45s.
  timeout: 120_000,
});

// quizClient is the only client here that needs a Bearer token — the quiz
// backend requires one whenever AUTH_BYPASS is off, unlike notes/chat which
// just pass a plain userId. Set lazily via this function (rather than
// importing Clerk's useAuth directly) so this module still works when
// ClerkProvider isn't mounted.
let _getClerkToken: (() => Promise<string | null>) | null = null;

/**
 * Call this once inside ClerkProvider to wire up the token getter.
 *
 *   import { setClerkTokenGetter } from "@/api/apiClients";
 *   setClerkTokenGetter(() => getToken({ template: "quiz-backend" }));
 */
export function setClerkTokenGetter(fn: () => Promise<string | null>) {
  _getClerkToken = fn;
}

// One-off token fetch for callers that can't ride the axios interceptor —
// e.g. a native WebSocket URL, which must carry the token as a query param
// rather than an Authorization header.
export async function getClerkToken(): Promise<string | null> {
  if (!_getClerkToken) return null;
  try {
    return await _getClerkToken();
  } catch {
    return null;
  }
}

// Resolved once Clerk finishes its initial auth-state check (`isLoaded`).
// Without this, a query that fires the instant a screen mounts can race
// ahead of Clerk restoring the session — harmless on iOS Simulator where
// that check is near-instant, but Android's slower cold start let the very
// first request go out with no token at all, getting a real 401 back.
//
// Capped at 3s rather than awaited unconditionally: if `isLoaded` never
// fires for some reason, every request should still go out (worst case,
// same as before this existed) instead of hanging forever.
let _resolveClerkReady: (() => void) | null = null;
const _clerkReady = new Promise<void>((resolve) => {
  _resolveClerkReady = resolve;
});
const _clerkReadyOrTimeout = Promise.race([
  _clerkReady,
  new Promise<void>((resolve) => setTimeout(resolve, 3000)),
]);

export function markClerkReady() {
  _resolveClerkReady?.();
}

// Shared by every client that needs a Bearer token (currently quizClient and
// battleClient) — attaches the same Clerk-ready-gated token fetch and the
// same error-message normalization to whichever axios instance is passed in.
function attachAuthInterceptors(client: ReturnType<typeof create>) {
  client.interceptors.request.use(async (config) => {
    await _clerkReadyOrTimeout;
    if (_getClerkToken) {
      try {
        const token = await _getClerkToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Token fetch failed; send without — backend bypass will handle dev
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const message =
        error?.response?.data?.detail ??
        error?.message ??
        "An unexpected error occurred";
      return Promise.reject(new Error(message));
    }
  );
}

attachAuthInterceptors(quizClient);

// Online 1v1 battle mode's own microservice (Quiz-Battle-Service) -- shares
// the same Clerk auth as quizClient (same users), reached through the
// gateway at /api/battle instead of /api/quiz.
export const battleClient = create({
  baseURL: `${SERVICE_URLS.battle}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45_000,
});
attachAuthInterceptors(battleClient);

export const pdfClient = create({
  baseURL: SERVICE_URLS.pdf,
  timeout: 30000,
});

// The lab service defines its own /api prefix behind the gateway prefix, same as notes.
export const labClient = create({
  baseURL: `${SERVICE_URLS.lab}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Lab backend auth is its own JWT (exchanged once from the signed-in Clerk user via
// /api/auth/sync and cached in providers/labAuthToken.ts, kept fresh by
// providers/LabAuthSyncBoundary.tsx), not a Clerk token directly — unlike quizClient above.
labClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getNotesResourceUrl(path: string): string {
  return `${SERVICE_URLS.notes}/${path.replace(/^\/+/, "")}`;
}

// Turns a lab-service media reference into a loadable absolute URL. The backend returns either an
// already-absolute URL (S3/Cloudinary) — passed straight through — or a gateway-relative path
// like "api/media/chemicals/<id>" that resolves against the lab service base. The app never needs
// to know where the binary actually lives.
export function getLabResourceUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SERVICE_URLS.lab}/${pathOrUrl.replace(/^\/+/, "")}`;
}
