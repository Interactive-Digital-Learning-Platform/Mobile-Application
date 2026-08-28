import { ChatAttachment } from "@/types/chatModuleTypes";
import { Image } from "expo-image";
import { FileText } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";


export default function MessageAttachment({
  attachment,
  onUserBubble,
}: {
  attachment: ChatAttachment;
  onUserBubble: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const thumbUri = attachment.localUri ?? attachment.previewUrl;
  const showImage =
    attachment.kind === "image" && !!thumbUri && !imageFailed;

  const analyzing =
    attachment.status === "uploading" || attachment.status === "processing";
  const failed = attachment.status === "failed";

  const subtleText = onUserBubble ? "text-white/80" : "text-[#6B7280]";

  return (
    <View className="rounded-xl overflow-hidden" style={{ maxWidth: 220 }}>
      {showImage ? (
        <Image
          source={{ uri: thumbUri }}
          style={{
            width: 200,
            maxWidth: "100%",
            aspectRatio: 4 / 3,
            borderRadius: 12,
          }}
          contentFit="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View
          className="flex-row items-center gap-3 rounded-xl px-3 py-3"
          style={{
            backgroundColor: onUserBubble
              ? "rgba(255,255,255,0.16)"
              : "#FFFFFF",
            minWidth: 180,
          }}
        >
          <View className="w-9 h-9 rounded-lg bg-[#EAF4FF] justify-center items-center">
            <FileText size={20} color="#FC6E20" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text
              numberOfLines={1}
              className={`text-sm font-amedium ${onUserBubble ? "text-white" : "text-[#0F172A]"}`}
            >
              {attachment.filename}
            </Text>
            <Text className={`text-xs font-aregular ${subtleText}`}>
              {attachment.kind === "pdf" ? "PDF document" : "Attachment"}
            </Text>
          </View>
        </View>
      )}

      {analyzing && (
        <View className="flex-row items-center gap-2 mt-1.5">
          <ActivityIndicator size="small" color={onUserBubble ? "#FFFFFF" : "#6B7280"} />
          <Text className={`text-xs font-aregular ${subtleText}`}>
            Analyzing attachment…
          </Text>
        </View>
      )}

      {failed && (
        <Text className="text-xs font-aregular mt-1.5 text-[#F87171]">
          {attachment.error
            ? `Attachment analysis failed — ${attachment.error}`
            : "Attachment analysis failed"}
        </Text>
      )}
    </View>
  );
}
