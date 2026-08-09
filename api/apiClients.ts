import { create } from "axios";


export const API_GATEWAY_URL = (
  process.env.EXPO_PUBLIC_API_GATEWAY_URL || ""
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

export const quizClient = create({
  baseURL: `${SERVICE_URLS.quiz}/api/v1`,
});

export const pdfClient = create({
  baseURL: SERVICE_URLS.pdf,
  timeout: 30000,
});

export function getNotesResourceUrl(path: string): string {
  return `${SERVICE_URLS.notes}/${path.replace(/^\/+/, "")}`;
}
