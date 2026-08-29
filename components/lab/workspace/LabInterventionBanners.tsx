import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { AlertTriangle, Eye, Sparkles, X } from "lucide-react-native";

// Proactive pedagogical intervention (server meta.intervention, non-safety types) — a small,
// dismissible banner so it isn't silently buried in the Hint Center. It is ALSO still queued in
// the Hint Center history by the workspace; this is just the "chime in" surface.
export function TutorInsightBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(160)}
      className="mx-4 mt-2 p-3 rounded-2xl bg-violet-50 border border-violet-100 flex-row gap-2"
    >
      <Sparkles size={16} color="#7C3AED" strokeWidth={2} />
      <View className="flex-1">
        <Text className="text-[11px] font-bold uppercase tracking-wide text-violet-500 mb-0.5">Tutor insight</Text>
        <Text className="text-[13px] text-slate-700 leading-5">{message}</Text>
      </View>
      <TouchableOpacity onPress={onDismiss} hitSlop={8}>
        <X size={15} color="#94A3B8" strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// A reaction fired live on the bench — surface the *observation* first (colour change, gas, etc.),
// not the theory. "Explore why" opens the Educational Info Panel; dismissing just clears it.
export function ObservationBanner({
  reactionName,
  onExplore,
  onDismiss,
}: {
  reactionName: string;
  onExplore: () => void;
  onDismiss: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(160)}
      className="mx-4 mt-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex-row gap-2"
    >
      <Eye size={16} color="#059669" strokeWidth={2} />
      <View className="flex-1">
        <Text className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 mb-0.5">Observation detected</Text>
        <Text className="text-[13px] text-slate-700 leading-5">Something changed on the bench — {reactionName.toLowerCase()}.</Text>
        <TouchableOpacity className="self-start mt-2 px-3 py-1.5 rounded-lg bg-emerald-600" activeOpacity={0.85} onPress={onExplore}>
          <Text className="text-white text-[12px] font-bold">Explore why</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onDismiss} hitSlop={8}>
        <X size={15} color="#94A3B8" strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// A backend-recorded observable change on a container that isn't itself a catalogued reaction —
// most often an indicator colour change (spec §23: the observation text and the visual must
// agree, and both come from the server's observableState). Compact, self-dismissing, no "explore".
export function ObservationChangeBanner({
  description,
  swatchColor,
  onDismiss,
}: {
  description: string;
  swatchColor?: string | null;
  onDismiss: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(160)}
      className="mx-4 mt-2 p-3 rounded-2xl bg-sky-50 border border-sky-100 flex-row items-center gap-2.5"
    >
      {swatchColor ? (
        <View style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: swatchColor }} />
      ) : (
        <Eye size={16} color="#0284C7" strokeWidth={2} />
      )}
      <Text className="flex-1 text-[13px] text-slate-700 leading-5">{description}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={8}>
        <X size={15} color="#94A3B8" strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Safety intervention (server intervention types heating_empty_container / unnecessary_heat) —
// visually distinct and requires an explicit acknowledgement. Safety determination stays
// server-authoritative; this only presents it.
export function SafetyBanner({ message, onAcknowledge }: { message: string; onAcknowledge: () => void }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      className="mx-4 mt-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex-row gap-2.5"
    >
      <AlertTriangle size={18} color="#E11D48" strokeWidth={2} />
      <View className="flex-1">
        <Text className="text-[11px] font-black uppercase tracking-wide text-rose-600 mb-1">Safety</Text>
        <Text className="text-[13px] text-rose-900 leading-5">{message}</Text>
        <TouchableOpacity className="self-start mt-2.5 px-3.5 py-1.5 rounded-lg bg-rose-600" activeOpacity={0.85} onPress={onAcknowledge}>
          <Text className="text-white text-[12px] font-bold">Review setup</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
