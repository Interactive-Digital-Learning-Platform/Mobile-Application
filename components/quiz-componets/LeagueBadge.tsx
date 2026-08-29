import { Text, View } from "react-native";
import { Shield } from "lucide-react-native";
import { getLeagueStyle } from "@/constants/battleStyles";
import { League } from "@/types/battleModuleTypes";

// Shared league pill -- a Shield icon tinted with that league's own color
// (not just the badge's bg/text theme) so the tier reads at a glance even
// before the label text is parsed, everywhere a league is surfaced.
export default function LeagueBadge({
  league,
  fallbackLabel = "Unranked",
  size = "sm",
}: {
  league: League | string | null | undefined;
  fallbackLabel?: string;
  size?: "sm" | "md";
}) {
  const style = getLeagueStyle(league);
  const iconSize = size === "md" ? 13 : 11;
  const textClass = size === "md" ? "text-xs" : "text-[10px]";

  return (
    <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${style.bg}`}>
      <Shield size={iconSize} color={style.color} fill={style.color} strokeWidth={1.5} />
      <Text className={`${textClass} font-bold ${style.text}`}>{league ?? fallbackLabel}</Text>
    </View>
  );
}
