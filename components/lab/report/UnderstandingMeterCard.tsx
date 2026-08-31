import { Text, View } from "react-native";
import { Brain } from "lucide-react-native";
import { INFO_COPY, UNDERSTANDING_LEVELS } from "@/constants/lab/report.constants";
import { UnderstandingView } from "@/types/lab";
import { SectionHeading, InfoHint } from "./primitives";

// Compact visual replacement for the paragraph-only Understanding card (spec §2). Colour + a
// 4-segment meter + the level word + one sentence — accessible without relying on colour alone.
export default function UnderstandingMeterCard({ understanding }: { understanding: UnderstandingView }) {
  if (!understanding) return null;
  const style = UNDERSTANDING_LEVELS[understanding.level];

  return (
    <View>
      <SectionHeading
        title="Understanding"
        icon={Brain}
        iconColor={style.iconColor}
        right={<InfoHint title="What understanding means" body={INFO_COPY.understanding} />}
      />
      <View className="rounded-2xl bg-white border border-slate-100 p-4">
        <View className={`self-start flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${style.chipBg}`}>
          <Text className={`text-[12px] font-bold ${style.chipText}`}>{style.label}</Text>
        </View>

        <View className="flex-row gap-1.5 mt-3">
          {[1, 2, 3, 4].map((seg) => (
            <View
              key={seg}
              className={`flex-1 h-2 rounded-full ${seg <= understanding.meterFilled ? style.barColor : "bg-slate-100"}`}
            />
          ))}
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-[9px] font-semibold text-slate-300">Needs support</Text>
          <Text className="text-[9px] font-semibold text-slate-300">Strong</Text>
        </View>

        <Text className="text-[13px] text-slate-600 leading-5 mt-3">{understanding.explanation}</Text>
      </View>
    </View>
  );
}
