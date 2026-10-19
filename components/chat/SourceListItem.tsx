import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ChevronDown, ExternalLink, FileText, Globe } from "lucide-react-native";
import { SourceCitationType } from "@/schemas/chatSchemas";

function hostFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/^https?:\/\/([^/]+)/i);
  return match ? match[1].replace(/^www\./, "") : null;
}

function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function formatScore(score?: number | null): string | null {
  if (typeof score !== "number" || Number.isNaN(score) || score <= 0) return null;
  return score <= 1 ? `${Math.round(score * 100)}%` : score.toFixed(2);
}

function relevanceFraction(score?: number | null): number | null {
  if (typeof score !== "number" || Number.isNaN(score) || score <= 0) return null;
  return score <= 1 ? score : null;
}

type DetailRow = {
  label: string;
  value: string;
  href?: string;
  variant?: "text" | "meter";
};

export default function SourceListItem({
  source,
  index,
}: {
  source: SourceCitationType;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration: 160 });
  }, [open, progress]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  const filename = source.filename?.trim() || "";
  const provider = capitalizeFirst(source.provider?.trim() || "");
  const host = hostFromUrl(source.url);
  const hasTitle = Boolean(source.title?.trim());
  const isWeb = Boolean(host);

  const title = hasTitle ? source.title!.trim() : filename || "Untitled source";

  const origin = hasTitle
    ? filename || provider || host
    : provider || host || (source.page ? `Page ${source.page}` : null);

  const rows: DetailRow[] = [];
  if (hasTitle && filename) rows.push({ label: "File", value: filename });
  if (source.page && source.page > 0)
    rows.push({ label: "Page", value: String(source.page) });

  const fraction = relevanceFraction(source.score);
  const scoreLabel = formatScore(source.score);
  if (fraction !== null && scoreLabel)
    rows.push({ label: "Relevance", value: scoreLabel, variant: "meter" });
  else if (scoreLabel) rows.push({ label: "Relevance", value: scoreLabel });

  if (provider) rows.push({ label: "Provider", value: provider });
  if (source.url)
    rows.push({ label: "Link", value: host ?? source.url, href: source.url });

  return (
    <Animated.View
      layout={LinearTransition.duration(160)}
      entering={FadeInDown.duration(260).delay(Math.min(index, 6) * 45)}
      style={{
        borderWidth: 1,
        borderColor: open ? "#CFE2F6" : "#E7EDF5",
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        padding: 14,
        shadowColor: "#1E3A5F",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            backgroundColor: "#FFF1E8",
            borderWidth: 1,
            borderColor: "#FBD9C2",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text className="text-[12px] font-abold text-[#FC6E20]">
            {index + 1}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={2}
            className="text-[15px] font-amedium text-zinc-800"
          >
            {title}
          </Text>
          {origin && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginTop: 3,
              }}
            >
              {isWeb ? (
                <Globe size={12} color="#7C8BA0" />
              ) : (
                <FileText size={12} color="#7C8BA0" />
              )}
              <Text
                numberOfLines={1}
                className="text-xs font-aregular text-[#5B6472] flex-1"
              >
                from {origin}
              </Text>
            </View>
          )}
        </View>

        <Animated.View style={chevronStyle}>
          <ChevronDown size={18} color="#94A3B8" />
        </Animated.View>
      </Pressable>

      {open && (
        <Animated.View
          entering={FadeIn.duration(140)}
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "#EEF3F9",
            gap: 12,
          }}
        >
          {rows.length === 0 ? (
            <Text className="text-[13px] font-aregular text-[#94A3B8]">
              No extra detail was attached to this citation.
            </Text>
          ) : (
            rows.map((row) => (
              <View key={row.label}>
                <Text
                  className="text-[10.5px] font-aregular text-[#94A3B8] mb-1.5"
                  style={{ letterSpacing: 0.6, textTransform: "uppercase" }}
                >
                  {row.label}
                </Text>

                {row.variant === "meter" && fraction !== null ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#F6ECE3",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.round(fraction * 100)}%`,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#FC6E20",
                        }}
                      />
                    </View>
                    <Text className="text-[13px] font-amedium text-[#0F172A]">
                      {row.value}
                    </Text>
                  </View>
                ) : row.href ? (
                  <Pressable
                    onPress={() => Linking.openURL(row.href!)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      className="text-[13px] font-amedium text-[#2C7BE5] flex-1"
                    >
                      {row.value}
                    </Text>
                    <ExternalLink size={12} color="#2C7BE5" />
                  </Pressable>
                ) : (
                  <Text className="text-[13px] font-aregular text-[#42506A]">
                    {row.value}
                  </Text>
                )}
              </View>
            ))
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}
