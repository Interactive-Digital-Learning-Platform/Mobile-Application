import { GeneratedDocumentType } from "@/schemas/chatSchemas";
import { downloadAndShareDocument } from "@/utils/documentDownload";
import { Download, FileText } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export default function GeneratedDocumentAttachment({
  document,
}: {
  document: GeneratedDocumentType;
}) {
  const [downloading, setDownloading] = useState(false);

  const pages = document.page_count ?? null;
  const subtitle =
    pages != null ? `PDF · ${pages} page${pages === 1 ? "" : "s"}` : "PDF";

  const onDownload = () => {
    if (downloading) return;
    setDownloading(true);
    downloadAndShareDocument(document).finally(() => setDownloading(false));
  };

  return (
    <Pressable
      onPress={onDownload}
      hitSlop={8}
      android_ripple={{ color: "rgba(60,109,176,0.12)" }}
      className="flex-row items-center gap-3 rounded-xl px-3 py-3"
      style={{
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2EAF4",
        minWidth: 200,
        maxWidth: 260,
      }}
    >
      <View className="w-9 h-9 rounded-lg bg-[#EAF4FF] justify-center items-center">
        <FileText size={20} color="#FC6E20" />
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text
          numberOfLines={1}
          className="text-sm font-amedium text-[#0F172A]"
        >
          {document.filename}
        </Text>
        <Text className="text-xs font-aregular text-[#6B7280]">{subtitle}</Text>
      </View>
      {downloading ? (
        <ActivityIndicator size="small" color="#6B7280" />
      ) : (
        <Download size={18} color="#3C6DB0" />
      )}
    </Pressable>
  );
}
