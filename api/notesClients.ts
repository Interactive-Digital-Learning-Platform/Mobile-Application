import { create } from "axios";
import { getClerkInstance } from "@clerk/expo";
import { SERVICE_URLS } from "./apiClients";
import { NotesServiceError, normalizeNotesError } from "../utils/noteErrors";

// Separate instances: Notes authentication never changes another service's client.
export const notesClient = create({ baseURL: `${SERVICE_URLS.notes}/api`, timeout: 15000 });
export const notesAssetsClient = create({ baseURL: SERVICE_URLS.notes, timeout: 10000 });

/** Read the existing Clerk session without modifying the shared provider or Quiz auth. */
export async function getNotesSessionToken(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    let clerk: ReturnType<typeof getClerkInstance> | undefined;
    try { clerk = getClerkInstance(); } catch { /* The existing provider may still be initializing. */ }
    if (clerk?.loaded) {
      let token: string | null | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        token = await Promise.race([
          clerk.session?.getToken(),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new NotesServiceError("session")), 8000); }),
        ]);
      } catch { throw new NotesServiceError("session"); }
      finally { if (timer !== undefined) clearTimeout(timer); }
      if (!token) throw new NotesServiceError("auth");
      return token;
    }
    await new Promise<void>(resolve => setTimeout(resolve, 150));
  }
  throw new NotesServiceError("session");
}

for (const client of [notesClient, notesAssetsClient]) {
  client.interceptors.request.use(async config => {
    // Never forward the session to an absolute URL supplied in a server field.
    if (config.baseURL !== client.defaults.baseURL || !config.url || /[\\\r\n\t]/.test(config.url) || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(config.url)) {
      throw new NotesServiceError("invalid_response");
    }
    config.headers.Authorization = `Bearer ${await getNotesSessionToken()}`;
    return config;
  });
  client.interceptors.response.use(response => {
    if (client === notesClient && response.data?.success === false) throw new NotesServiceError();
    return response;
  }, failure => Promise.reject(normalizeNotesError(failure)));
}

export function getNotesResourceUrl(path: string): string {
  return `${SERVICE_URLS.notes}/${path.replace(/^\/+/, "")}`;
}
