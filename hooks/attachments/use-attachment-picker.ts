import {
  ALLOWED_ATTACHMENT_MIME,
  MAX_ATTACHMENT_BYTES,
  isAllowedAttachmentMime,
} from "@/constants/attachments";
import { PickedFile } from "@/types/chatModuleTypes";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import mime from "mime";
import { useCallback, useRef, useState } from "react";
import Toast from "react-native-toast-message";

type PendingResolver = (file: PickedFile | null) => void;

function toastInvalid(text2: string) {
  Toast.show({ type: "error", text1: "Can't attach that file", text2 });
}

function fileNameFromUri(uri: string, fallback: string): string {
  const tail = uri.split("/").pop();
  return tail && tail.length > 0 ? decodeURIComponent(tail) : fallback;
}

function validate(file: PickedFile): PickedFile | null {
  if (!isAllowedAttachmentMime(file.mimeType)) {
    toastInvalid("Only PDFs and images (PNG, JPEG) are supported.");
    return null;
  }
  if (typeof file.size === "number" && file.size > MAX_ATTACHMENT_BYTES) {
    toastInvalid("Files must be 20 MB or smaller.");
    return null;
  }
  return file;
}

export function useAttachmentPicker() {
  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<PendingResolver | null>(null);

  const settle = useCallback((file: PickedFile | null) => {
    setVisible(false);
    resolverRef.current?.(file);
    resolverRef.current = null;
  }, []);

  const pick = useCallback(() => {
    resolverRef.current?.(null);
    return new Promise<PickedFile | null>((resolve) => {
      resolverRef.current = resolve;
      setVisible(true);
    });
  }, []);

  const pickImage = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toastInvalid("Photo library permission is required.");
        settle(null);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (result.canceled) {
        settle(null);
        return;
      }

      const asset = result.assets[0];
      const name = asset.fileName ?? fileNameFromUri(asset.uri, "image.jpg");
      const mimeType =
        asset.mimeType ?? mime.getType(name) ?? mime.getType(asset.uri) ?? "";

      settle(
        validate({
          uri: asset.uri,
          name,
          mimeType,
          size: asset.fileSize,
        }),
      );
    } catch {
      toastInvalid("Something went wrong opening the photo library.");
      settle(null);
    }
  }, [settle]);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) {
        settle(null);
        return;
      }

      const asset = result.assets[0];
      const name = asset.name ?? fileNameFromUri(asset.uri, "document.pdf");
      const mimeType =
        asset.mimeType ?? mime.getType(name) ?? "application/pdf";

      settle(
        validate({
          uri: asset.uri,
          name,
          mimeType,
          size: asset.size ?? undefined,
        }),
      );
    } catch {
      toastInvalid("Something went wrong opening the file picker.");
      settle(null);
    }
  }, [settle]);

  const cancel = useCallback(() => settle(null), [settle]);

  return {
    pick,
    modalProps: {
      visible,
      onPickImage: pickImage,
      onPickDocument: pickDocument,
      onClose: cancel,
    },
    allowedMime: ALLOWED_ATTACHMENT_MIME,
  };
}
