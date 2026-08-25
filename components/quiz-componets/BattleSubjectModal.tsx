import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useState, useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { X, Swords } from "lucide-react-native";
import { getSubjectIcon, ICON_COLORS, SUBJECTS } from "@/constants/quizStyles";
import { getLeagueStyle } from "@/constants/battleStyles";
import { useBattleProfileQuery } from "@/hooks/use-battle";

const SHEET_OFFSCREEN_Y = 700;
const ANIM_MS = 250;

interface BattleSubjectModalProps {
  visible: boolean;
  onClose: () => void;
  onFindMatch: (subject: string) => void;
}

export default function BattleSubjectModal({ visible, onClose, onFindMatch }: BattleSubjectModalProps) {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const { data: profile } = useBattleProfileQuery();

  // Keep the modal mounted until the exit animation finishes, since RN's
  // <Modal> would otherwise unmount it instantly and cut the animation short.
  const [isMounted, setIsMounted] = useState(visible);
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SHEET_OFFSCREEN_Y);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      backdropOpacity.value = withTiming(1, { duration: ANIM_MS, easing: Easing.out(Easing.ease) });
      sheetTranslateY.value = withTiming(0, { duration: ANIM_MS, easing: Easing.out(Easing.cubic) });
    } else {
      backdropOpacity.value = withTiming(0, { duration: ANIM_MS, easing: Easing.in(Easing.ease) });
      sheetTranslateY.value = withTiming(
        SHEET_OFFSCREEN_Y,
        { duration: ANIM_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setIsMounted)(false);
        }
      );
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const mySubjectProfile = profile?.subjects.find((s) => s.subject === subject);
  const myLeagueStyle = getLeagueStyle(mySubjectProfile?.league);

  return (
    <Modal visible={isMounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[{ flex: 1, justifyContent: "flex-end" }, backdropStyle]} className="bg-black/40">
        <Animated.View style={sheetStyle} className="bg-white rounded-t-[32px] px-6 pt-6 pb-10">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-lg font-black text-slate-800">Find a Match</Text>
            <TouchableOpacity
              className="w-8 h-8 rounded-full bg-slate-100 justify-center items-center"
              activeOpacity={0.7}
              onPress={onClose}
            >
              <X size={16} color={ICON_COLORS.slate500} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Subject
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            {SUBJECTS.map((s) => {
              const SubjectIcon = getSubjectIcon(s);
              const isSelected = subject === s;
              return (
                <TouchableOpacity
                  key={s}
                  className={`mr-2 flex-row items-center gap-1.5 px-4 py-2 rounded-xl border ${
                    isSelected ? "bg-primary border-primary" : "bg-white border-slate-200"
                  }`}
                  activeOpacity={0.8}
                  onPress={() => setSubject(s)}
                >
                  <SubjectIcon
                    size={14}
                    color={isSelected ? ICON_COLORS.white : ICON_COLORS.slate500}
                    strokeWidth={2}
                  />
                  <Text className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-600"}`}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View className="flex-row items-center gap-2 bg-slate-50 px-4 py-3 rounded-2xl mb-7">
            <View className={`px-2 py-0.5 rounded-full ${myLeagueStyle.bg}`}>
              <Text className={`text-[10px] font-bold ${myLeagueStyle.text}`}>
                {mySubjectProfile?.league ?? "Unranked"}
              </Text>
            </View>
            <Text className="text-slate-600 text-xs font-semibold">
              {mySubjectProfile ? `Rating ${mySubjectProfile.rating}` : "Play your first match to get rated"}
            </Text>
          </View>

          <TouchableOpacity
            className="bg-primary flex-row justify-center items-center gap-2 py-4 rounded-2xl shadow-lg shadow-primary/30"
            activeOpacity={0.85}
            onPress={() => onFindMatch(subject)}
          >
            <Swords size={18} color={ICON_COLORS.white} strokeWidth={2.5} />
            <Text className="text-white font-black text-base">Find Match</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
