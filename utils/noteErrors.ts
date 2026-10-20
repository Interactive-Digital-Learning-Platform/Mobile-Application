/** Student-safe Notes failures. Never display provider messages or request data. */
export type NotesFailureKind = "unavailable" | "network" | "timeout" | "auth" | "session" | "cancelled" | "invalid_response";
const messages: Record<NotesFailureKind, string> = {
  unavailable: "Notes isn't available right now. Please try again in a moment.",
  network: "We couldn't reach Notes. Check your internet connection and try again.",
  timeout: "Notes is taking longer than usual. Please try again in a moment.",
  auth: "Please sign in again to access your notes.",
  session: "We couldn't check your session. Please try again.",
  cancelled: "Request cancelled.",
  invalid_response: "We couldn't load this Notes content. Please try again in a moment.",
};

export class NotesServiceError extends Error {
  readonly response?: { status: number; data: { error: string } };
  readonly code?: string;
  constructor(readonly kind: NotesFailureKind = "unavailable", status?: number, code?: string) {
    super(status ? statusMessage(status) : messages[kind]);
    this.name = "NotesServiceError";
    this.code = code;
    if (status) this.response = { status, data: { error: this.message } };
  }
}

function statusMessage(status: number): string {
  if (status === 401) return messages.auth;
  if (status === 403) return "This note or action isn't available for your account.";
  if (status === 404) return "This note or study material is no longer available. Return to Notes and refresh.";
  if (status === 408 || status === 504) return messages.timeout;
  if (status === 409) return "This note is already being updated. Please wait a moment, then refresh.";
  if (status === 413) return "These photos are too large. Try uploading fewer pages or smaller photos.";
  if (status === 415) return "This photo format isn't supported. Please choose a JPG or PNG photo.";
  if (status === 400 || status === 422) return "Please check the details you entered and try again.";
  if (status === 429) return "Notes is busy right now. Please wait a little before trying again.";
  return messages.unavailable;
}

export function normalizeNotesError(failure: unknown): NotesServiceError {
  if (failure instanceof NotesServiceError) return failure;
  const value = failure as { code?: string; name?: string; response?: { status?: unknown } } | null;
  if (value?.code === "ERR_CANCELED" || value?.name === "AbortError") return new NotesServiceError("cancelled", undefined, "ERR_CANCELED");
  const status = value?.response?.status;
  if (typeof status === "number" && status >= 400 && status <= 599) return new NotesServiceError("unavailable", status);
  if (value?.code === "ECONNABORTED" || value?.code === "ETIMEDOUT") return new NotesServiceError("timeout");
  if (["ERR_NETWORK", "ECONNREFUSED", "ENOTFOUND"].includes(value?.code || "")) return new NotesServiceError("network");
  return new NotesServiceError();
}

export function notesErrorMessage(failure: unknown, fallback = messages.unavailable): string {
  const normalized = normalizeNotesError(failure);
  return normalized.kind === "unavailable" && !normalized.response ? fallback : normalized.message;
}
