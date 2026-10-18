import { create } from "axios";
import { getClerkInstance } from "@clerk/expo";
import { SERVICE_URLS } from "./apiClients";

// Separate instances: Notes authentication never changes another service's client.
export const notesClient = create({ baseURL: `${SERVICE_URLS.notes}/api`, timeout: 60000 });
export const notesAssetsClient = create({ baseURL: SERVICE_URLS.notes, timeout: 10000 });

/** Read the existing Clerk session without modifying the shared provider or Quiz auth. */
export async function getNotesSessionToken(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    let clerk: ReturnType<typeof getClerkInstance> | undefined;
    try { clerk = getClerkInstance(); } catch { /* The existing provider may still be initializing. */ }
    if (clerk?.loaded) {
      const token = await clerk.session?.getToken();
      if (!token) throw new Error("Please sign in to access your notes.");
      return token;
    }
    await new Promise<void>(resolve => setTimeout(resolve, 150));
  }
  throw new Error("Your session is still loading. Please try again.");
}

for (const client of [notesClient, notesAssetsClient]) {
  client.interceptors.request.use(async config => {
    // Never forward the session to an absolute URL supplied in a server field.
    if (config.baseURL !== client.defaults.baseURL || !config.url || /[\\\r\n\t]/.test(config.url) || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(config.url)) {
      throw new Error("Invalid Notes resource address");
    }
    config.headers.Authorization = `Bearer ${await getNotesSessionToken()}`;
    return config;
  });
  client.interceptors.response.use(response => response, failure => {
    // Existing screens log errors. Keep bearer-bearing request/config objects out of those logs.
    const message = typeof failure?.response?.data?.error === "string"
      ? failure.response.data.error : failure?.message || "Notes request failed";
    const error = new Error(message);
    return Promise.reject(Object.assign(error, failure?.response ? {
      response: { status: failure.response.status, data: failure.response.data },
    } : {}));
  });
}

export function getNotesResourceUrl(path: string): string {
  return `${SERVICE_URLS.notes}/${path.replace(/^\/+/, "")}`;
}
