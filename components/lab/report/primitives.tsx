import { ReactNode, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { ChevronDown, Info, X, type LucideIcon } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

// Small, un-"named" building blocks shared by the report components. The screen-level pieces
// listed in the spec (§15) each live in their own file and compose these.

// A quieter section heading — sentence case, not the old uppercase-grey treatment (spec §14).
export function SectionHeading({
  title,
  icon: Icon,
  iconColor = ICON_COLORS.slate500,
  right,
}: {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  right?: ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-2 mb-2.5 mt-1">
      {Icon && <Icon size={15} color={iconColor} strokeWidth={2.4} />}
      <Text className="text-[15px] font-bold text-slate-800 flex-1">{title}</Text>
      {right}
    </View>
  );
}

export function EvidenceChip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warning" | "danger" }) {
  const styles =
    tone === "danger"
      ? "bg-rose-50 text-rose-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  const [bg, text] = styles.split(" ");
  return (
    <View className={`px-2 py-1 rounded-lg ${bg}`}>
      <Text className={`text-[11px] font-semibold ${text}`}>{label}</Text>
    </View>
  );
}

// Tap-to-reveal explanation (spec §1 / §5 — no permanent formula text). Bottom-sheet Modal,
// matching the app's BiologyInfoSheet convention (no sheet library).
export function InfoHint({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`About ${title}`}
        className="w-6 h-6 items-center justify-center rounded-full"
      >
        <Info size={15} color={ICON_COLORS.slate400} strokeWidth={2.4} />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setOpen(false)}>
          <Pressable className="bg-white rounded-t-3xl p-5 pb-8" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[15px] font-bold text-slate-800">{title}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <X size={20} color={ICON_COLORS.slate500} />
              </Pressable>
            </View>
            <Text className="text-[13px] text-slate-600 leading-5">{body}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// Generic expand/collapse row used by the error accordion and time breakdown. The caller owns
// the open state so parents can enforce "only one or two open" (spec §4).
export function AccordionRow({
  open,
  onToggle,
  header,
  children,
  className = "",
  style,
}: {
  open: boolean;
  onToggle: () => void;
  header: ReactNode;
  children: ReactNode;
  className?: string;
  style?: object;
}) {
  return (
    <View className={`rounded-2xl bg-white border border-slate-100 overflow-hidden ${className}`} style={style}>
      <Pressable
        onPress={onToggle}
        className="flex-row items-center gap-2 p-3.5 min-h-[52px]"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View className="flex-1">{header}</View>
        <ChevronDown
          size={16}
          color={ICON_COLORS.slate400}
          strokeWidth={2.5}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </Pressable>
      {open && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} className="px-3.5 pb-3.5 -mt-1">
          {children}
        </Animated.View>
      )}
    </View>
  );
}

// Empty-state line for a tab section with genuinely nothing to show.
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-2xl bg-white border border-slate-100 p-4">
      <Text className="text-[12px] text-slate-400 leading-5">{children}</Text>
    </View>
  );
}
