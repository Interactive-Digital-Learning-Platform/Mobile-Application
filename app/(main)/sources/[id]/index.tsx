import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { ChevronLeft, CloudOff, FileSearch } from "lucide-react-native";
import { fetchMessageById } from "@/api/chatAPI";
import { SourceCitationType } from "@/schemas/chatSchemas";
import SourceListItem from "@/components/chat/SourceListItem";
import SourceItemSkeleton from "@/components/chat/SourceItemSkeleton";

export default function MessageSources() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["ai-message", id],
    queryFn: () => fetchMessageById(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  });

  const sources: SourceCitationType[] = data?.sources ?? [];
  const ready = !isLoading && !isError;
  const hasSources = sources.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#93CFFF", "#BEE2FF", "#EAF4FD", "#F8FAFC"]}
        locations={[0, 0.28, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View
          style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={{
                width: 34,
                height: 34,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: -6,
              }}
            >
              <ChevronLeft size={27} color="#FFFFFF" />
            </Pressable>

            <View style={{ flex: 1, paddingTop: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Text className="text-[22px] font-amedium text-white">
                  Sources
                </Text>
                {/*{ready && hasSources && (
                  <View
                    style={{
                      minWidth: 26,
                      height: 24,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: "#FFF1E8",
                      borderWidth: 1,
                      borderColor: "#FBD9C2",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text className="text-[12px] font-abold text-[#FC6E20]">
                      {sources.length}
                    </Text>
                  </View>
                )}*/}
              </View>
              {ready && (
                <Text className="text-[13px] font-aregular text-zinc-50 mt-1">
                  {hasSources
                    ? "Where Nous grounded this reply"
                    : "Nothing was cited for this reply"}
                </Text>
              )}
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SourceItemSkeleton key={i} />
            ))}
          </View>
        ) : isError ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 40,
              gap: 14,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#FFF1E9",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CloudOff size={26} color="#FC6E20" />
            </View>
            <Text className="text-[15px] font-amedium text-[#0F172A] text-center">
              Couldn&apos;t load sources
            </Text>
            <Text
              className="text-[13px] font-aregular text-[#64748B] text-center"
              style={{ lineHeight: 19 }}
            >
              The message couldn&apos;t be reached. Check your connection and try
              again.
            </Text>
            <Pressable
              onPress={() => refetch()}
              style={{
                marginTop: 4,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: "#FC6E20",
                shadowColor: "#FC6E20",
                shadowOpacity: 0.28,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              }}
            >
              <Text className="text-[13px] font-amedium text-white">
                {isRefetching ? "Retrying…" : "Try again"}
              </Text>
            </Pressable>
          </View>
        ) : !hasSources ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 40,
              gap: 14,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#EAF4FF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileSearch size={28} color="#2C7BE5" />
            </View>
            <Text className="text-[15px] font-amedium text-[#0F172A] text-center">
              No sources to show
            </Text>
            <Text
              className="text-[13px] font-aregular text-[#64748B] text-center"
              style={{ lineHeight: 19 }}
            >
              Nous answered this one from general knowledge — no documents or web
              pages were cited.
            </Text>
          </View>
        ) : (
          <FlashList
            data={sources}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <SourceListItem source={item} index={index} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 40,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
