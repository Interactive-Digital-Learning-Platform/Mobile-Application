import { ScrollView, Text, View } from "react-native";
import { QUICK_INSIGHT_META } from "@/constants/lab/report.constants";
import { QuickInsight } from "@/types/lab";

// Horizontal scan strip under the hero (spec §3). One icon + one number + short label per card.
export default function ReportQuickInsights({ insights }: { insights: QuickInsight[] }) {
  if (insights.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingRight: 4 }}
    >
      {insights.map((item) => {
        const meta = QUICK_INSIGHT_META[item.key];
        const Icon = meta.icon;
        return (
          <View
            key={item.key}
            className={`w-[132px] rounded-2xl border border-slate-100 p-3 ${meta.tint}`}
          >
            <Icon size={17} color={meta.iconColor} strokeWidth={2.3} />
            <Text className="text-[17px] font-black text-slate-800 mt-1.5" numberOfLines={1}>
              {item.value}
            </Text>
            <Text className="text-[11px] font-semibold text-slate-500 mt-0.5" numberOfLines={2}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
