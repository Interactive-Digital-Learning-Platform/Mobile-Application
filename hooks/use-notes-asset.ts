import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "@clerk/expo";
import * as FileSystem from "expo-file-system/legacy";
import { getNotesResourceUrl, getNotesSessionToken, notesAssetsClient } from "@/api/notesClients";

/** Fetch privately; HTML images/audio cannot reliably attach bearer headers. */
export function useNotesAsset(path?: string) {
  const { userId } = useAuth();
  const [asset, setAsset] = useState<{ uri: string; owner: string; path: string } | null>(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  const retry = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    setAsset(null); setError(false);
    if (!path || !userId) return;
    let disposed = false;
    let objectUrl: string | undefined;
    let file: string | undefined;
    let download: ReturnType<typeof FileSystem.createDownloadResumable> | undefined;
    const controller = new AbortController();
    const removeFile = () => file ? FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {}) : Promise.resolve();
    const load = async () => {
      const relative = `/${path.replace(/^\/+/, "")}`;
      if (!/^\/(uploads|generated_audio)\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(relative) || relative.includes("..")) throw new Error("Invalid Notes asset");
      if (Platform.OS === "web") {
        const response = await notesAssetsClient.get<Blob>(relative, { responseType: "blob", signal: controller.signal });
        if (disposed) return;
        objectUrl = URL.createObjectURL(response.data);
        setAsset({ uri: objectUrl, owner: userId, path });
      } else {
        const token = await getNotesSessionToken();
        if (disposed) return;
        if (!FileSystem.cacheDirectory) throw new Error("Device cache unavailable");
        const extension = relative.split(".").pop() || "bin";
        file = `${FileSystem.cacheDirectory}private-note-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
        download = FileSystem.createDownloadResumable(getNotesResourceUrl(relative), file, { headers: { Authorization: `Bearer ${token}` } });
        let timer: ReturnType<typeof setTimeout> | undefined;
        const response = await Promise.race([
          download.downloadAsync(),
          new Promise<never>((_, reject) => { timer = setTimeout(() => {
            void download?.cancelAsync().catch(() => {});
            reject(new Error("Notes asset timed out"));
          }, 15000); }),
        ]).finally(() => { if (timer !== undefined) clearTimeout(timer); });
        if (disposed) { await removeFile(); return; }
        if (!response || response.status !== 200) { await removeFile(); throw new Error("Asset unavailable"); }
        setAsset({ uri: response.uri, owner: userId, path });
      }
    };
    load().catch(async () => {
      await removeFile();
      if (!disposed) setError(true);
    });
    return () => {
      disposed = true; controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (download) download.cancelAsync().catch(() => {}).finally(removeFile);
      else void removeFile();
    };
  }, [path, userId, version]);
  return { uri: asset && asset.owner === userId && asset.path === path ? asset.uri : null, error, retry };
}
