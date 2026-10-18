import { ChatAttachment } from "@/types/chatModuleTypes";
import { Image } from "expo-image";
import { FileText, RefreshCw, X } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type Props = {
  attachment: ChatAttachment | null;
  onRemove: () => void;
  onRetry: () => void;
};

function StatusLine({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.status === "uploading") {
    const pct =
      typeof attachment.uploadProgress === "number"
        ? Math.round(attachment.uploadProgress * 100)
        : null;
    return (
      <View className="flex-row items-center gap-1.5">
        <ActivityIndicator size="small" color="#6B7280" />
        <Text className="text-xs font-aregular text-[#6B7280]">
          {pct !== null ? `Uploading ${pct}%` : "Uploading…"}
        </Text>
      </View>
    );
  }

  if (attachment.status === "processing") {
    return (
      <View className="flex-row items-center gap-1.5">
        <ActivityIndicator size="small" color="#6B7280" />
        <Text className="text-xs font-aregular text-[#6B7280]">Analyzing…</Text>
      </View>
    );
  }

  if (attachment.status === "ready") {
    return (
      <Text className="text-xs font-aregular text-[#16A34A]">Ready</Text>
    );
  }

  return (
    <Text className="text-xs font-aregular text-[#EF4444]" numberOfLines={1}>
      {attachment.error ?? "Upload failed"}
    </Text>
  );
}

export default function AttachmentPreviewBar({
  attachment,
  onRemove,
  onRetry,
}: Props) {
  if (!attachment) return null;

  const isImage = attachment.kind === "image" && !!attachment.localUri;

  return (
    <View className="px-3 pt-3 pb-2 border-b border-[#E6E6E6]">
      <View className="flex-row items-center gap-3">
        {isImage ? (
          <Image
            source={{ uri: attachment.localUri }}
            style={{ width: 44, height: 44, borderRadius: 8 }}
            contentFit="cover"
          />
        ) : (
          <View className="w-11 h-11 rounded-lg bg-[#EAF4FF] justify-center items-center">
            <FileText size={22} color="#FC6E20" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            className="text-sm font-amedium text-[#0F172A]"
          >
            {attachment.filename}
          </Text>
          <StatusLine attachment={attachment} />
        </View>

        {attachment.status === "failed" && (
          <Pressable
            onPress={onRetry}
            hitSlop={8}
            className="w-8 h-8 rounded-full bg-[#F2F2F2] justify-center items-center"
          >
            <RefreshCw size={15} color="#6B7280" />
          </Pressable>
        )}

        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="w-8 h-8 rounded-full bg-[#F2F2F2] justify-center items-center"
        >
          <X size={16} color="#6B7280" />
        </Pressable>
      </View>
    </View>
  );
}
