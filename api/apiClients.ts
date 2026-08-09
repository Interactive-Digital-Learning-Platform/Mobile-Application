import { create } from "axios";

const DEFAULT_API_GATEWAY_URL = "http://10.0.2.2:8080";

export const API_GATEWAY_URL = (
  process.env.EXPO_PUBLIC_API_GATEWAY_URL || DEFAULT_API_GATEWAY_URL
).replace(/\/$/, "");

export const SERVICE_URLS = {
  assistant: `${API_GATEWAY_URL}/api/assistant`,
  notes: `${API_GATEWAY_URL}/api/notes`,
  quiz: `${API_GATEWAY_URL}/api/quiz`,
  pdf: `${API_GATEWAY_URL}/api/pdf`,
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
  timeout: 10000,
});

export const notesAssetsClient = create({
  baseURL: SERVICE_URLS.notes,
  timeout: 10000,
});

// The gateway doesn't proxy the quiz service yet, so until
// EXPO_PUBLIC_API_GATEWAY_URL is actually set, quizClient talks to it
// directly via EXPO_PUBLIC_BACKEND_URL instead (the gateway default above
// only resolves on Android emulators, and nothing's listening on it
// anyway). Once the gateway is live, just set that env var — no code
// change needed here.
const DEFAULT_QUIZ_SERVICE_URL = "http://localhost:8000";
const QUIZ_DIRECT_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_QUIZ_SERVICE_URL
).replace(/\/$/, "");

export const quizClient = create({
  baseURL: process.env.EXPO_PUBLIC_API_GATEWAY_URL
    ? `${SERVICE_URLS.quiz}/api/v1`
    : `${QUIZ_DIRECT_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  // AI generation (with retry backoff) and quiz submission (several
  // sequential DB round-trips against Neon) have both been measured taking
  // 18s+ on a 10-question quiz, so the timeout is generous.
  timeout: 45_000,
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

quizClient.interceptors.request.use(async (config) => {
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

quizClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.detail ??
      error?.message ??
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

export const pdfClient = create({
  baseURL: SERVICE_URLS.pdf,
  timeout: 30000,
});

export function getNotesResourceUrl(path: string): string {
  return `${SERVICE_URLS.notes}/${path.replace(/^\/+/, "")}`;
}
