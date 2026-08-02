/**
 * axios.tsx
 * ─────────
 * Shared Axios instance for the Personalized Quiz Service.
 *
 * - Base URL comes from EXPO_PUBLIC_BACKEND_URL in .env
 * - The request interceptor tries to attach the Clerk JWT.
 *   If Clerk is not active (e.g. ClerkProvider is commented out)
 *   or the token fetch fails it sends the request without a token —
 *   this is fine because the backend has AUTH_BYPASS=true in development.
 */
import axios from "axios";

// ── Try to import Clerk's useAuth lazily so this module works even when
// ── ClerkProvider is not mounted (Clerk is currently commented out in _layout).
let _getClerkToken: (() => Promise<string | null>) | null = null;

/**
 * Call this once inside ClerkProvider to wire up the token getter.
 * Import from this file and call it in your Clerk-aware component.
 *
 *   import { setClerkTokenGetter } from "@/providers/axios";
 *   setClerkTokenGetter(() => getToken({ template: "quiz-backend" }));
 */
export function setClerkTokenGetter(fn: () => Promise<string | null>) {
  _getClerkToken = fn;
}

const axiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  // 45-second timeout. Covers both AI generation (Groq + retry backoff on
  // transient errors) and quiz submission — submit isn't AI-backed, but it's
  // a chain of several sequential DB round-trips (grade answers, write
  // attempts, update mastery, update analytics) against a remote Neon
  // Postgres, which was measured taking 18s+ for even a 10-question quiz.
  // The previous 15s timeout was tuned only for generation and fired before
  // submit could ever finish, making the app report "Could not save to
  // server" on saves that were actually succeeding a few seconds later.
  timeout: 45_000,
});

// ── Request interceptor — attach Bearer token when available ──────────────────
axiosInstance.interceptors.request.use(async (config) => {
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

// ── Response interceptor — normalise error messages ───────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.detail ??
      error?.message ??
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;

