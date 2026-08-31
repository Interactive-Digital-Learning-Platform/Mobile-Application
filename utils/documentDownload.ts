import { GeneratedDocumentType } from "@/schemas/chatSchemas";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import Toast from "react-native-toast-message";

const inFlight = new Set<string>();

function localPathFor(doc: GeneratedDocumentType): string {
  return `${FileSystem.cacheDirectory}${doc.document_id}.pdf`;
}

export async function downloadAndShareDocument(
  doc: GeneratedDocumentType,
): Promise<void> {
  if (!doc.download_url) {
    Toast.show({ type: "error", text1: "Download unavailable" });
    return;
  }

  if (inFlight.has(doc.document_id)) return;
  inFlight.add(doc.document_id);

  const target = localPathFor(doc);

  try {
    let localUri = target;
    const existing = await FileSystem.getInfoAsync(target);

    if (!existing.exists) {
      const res = await FileSystem.downloadAsync(doc.download_url, target);

      if (res.status !== 200) {
        await FileSystem.deleteAsync(target, { idempotent: true });
        Toast.show({
          type: "error",
          text1: "Download link expired",
          text2: "Ask for the document again.",
        });
        return;
      }

      localUri = res.uri;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: doc.filename,
      });
    } else {
      await WebBrowser.openBrowserAsync(doc.download_url);
    }
  } catch (error) {
    console.warn("[documentDownload] failed", error);
    Toast.show({ type: "error", text1: "Couldn't download the document" });
  } finally {
    inFlight.delete(doc.document_id);
  }
}
