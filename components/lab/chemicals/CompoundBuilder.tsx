import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { CheckCircle2, X } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useDropTargetRegistry } from "@/hooks/lab/use-drop-target-registry";
import { useCompoundBuildTemplate, useSubmitCompoundBuild } from "@/hooks/lab/use-compound-builder";
import { CompoundBuilderProps } from "@/types/lab";
import Button from "@/components/ui/Button";
import SheetHandle from "@/components/ui/SheetHandle";

type RegisterFn = ReturnType<typeof useDropTargetRegistry>["register"];

// Reuses the same Gesture.Pan + drop-target-registry hit-testing pattern as ChemicalBottle.tsx
// (dragging a chemical onto equipment), applied here to dragging a coefficient onto a blank in
// the equation instead of a chemical onto a piece of equipment.
const DraggableNumberTile = ({
  value,
  resolveDropTarget,
  onDropped,
  onHoverChange,
}: {
  value: number;
  resolveDropTarget: (x: number, y: number) => Promise<string | null>;
  onDropped: (value: number, blankId: string) => void;
  onHoverChange?: (blankId: string | null) => void;
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const lastCheckTs = useSharedValue(0);

  const checkHover = (x: number, y: number) => {
    resolveDropTarget(x, y).then((id) => onHoverChange?.(id));
  };

  const handleDrop = async (x: number, y: number) => {
    const targetId = await resolveDropTarget(x, y);
    if (targetId) onDropped(value, targetId);
    onHoverChange?.(null);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(1.15);
    })
    .onChange((e) => {
      translateX.value += e.changeX;
      translateY.value += e.changeY;
      if (onHoverChange) {
        const now = Date.now();
        if (now - lastCheckTs.value > 120) {
          lastCheckTs.value = now;
          runOnJS(checkHover)(e.absoluteX, e.absoluteY);
        }
      }
    })
    .onEnd((e) => {
      scale.value = withSpring(1);
      runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
    zIndex: translateX.value !== 0 || translateY.value !== 0 ? 100 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle}>
        <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.primaryBlack }}>
          <Text className="text-white font-amedium text-base">{value}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const BlankBox = ({
  blankId,
  value,
  register,
  onClear,
  isDropTarget,
}: {
  blankId: string;
  value: number | null;
  register: RegisterFn;
  onClear: () => void;
  isDropTarget?: boolean;
}) => {
  // Brief emerald confirmation the moment a coefficient lands, before settling into the normal
  // "filled" primary-bordered state — same pattern as EquipmentContainer's placed/pour glow.
  const [justFilled, setJustFilled] = useState(false);
  const prevValue = useRef(value);
  useEffect(() => {
    if (value != null && prevValue.current == null) {
      setJustFilled(true);
      const t = setTimeout(() => setJustFilled(false), 500);
      return () => clearTimeout(t);
    }
    prevValue.current = value;
  }, [value]);

  const hoverPulse = useSharedValue(1);
  useEffect(() => {
    hoverPulse.value = isDropTarget ? withRepeat(withTiming(0.4, { duration: 450 }), -1, true) : withTiming(1, { duration: 150 });
  }, [isDropTarget, hoverPulse]);
  const hoverPulseStyle = useAnimatedStyle(() => ({ opacity: hoverPulse.value }));

  return (
    <View ref={register(blankId)} style={{ width: 44, height: 44 }}>
      <Pressable onPress={value != null ? onClear : undefined}>
        <View
          className="w-11 h-11 rounded-lg items-center justify-center border-2"
          style={{
            borderColor: justFilled ? "#10B981" : value != null ? colors.primary : colors.borderColorLight,
            borderStyle: value != null ? "solid" : "dashed",
            backgroundColor: justFilled ? "#ECFDF5" : "transparent",
          }}
        >
          <Text className="font-amedium text-base" style={{ color: justFilled ? "#10B981" : value != null ? colors.primary : "#979797" }}>
            {value ?? "?"}
          </Text>
        </View>
      </Pressable>
      {isDropTarget && (
        <Animated.View
          pointerEvents="none"
          entering={FadeIn.duration(100)}
          exiting={FadeOut.duration(150)}
          style={[
            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary },
            hoverPulseStyle,
          ]}
        />
      )}
    </View>
  );
};

export default function CompoundBuilder({ experimentId, sessionId, compoundId, onClose, onBuilt }: CompoundBuilderProps) {
  const { data: template, isLoading, isError, refetch } = useCompoundBuildTemplate(experimentId, compoundId);
  const submitMutation = useSubmitCompoundBuild(sessionId);
  const { register, resolveDropTarget } = useDropTargetRegistry();

  const [assignments, setAssignments] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<{ correct: boolean; hint?: string } | null>(null);
  const [successPayload, setSuccessPayload] = useState<{ balancedEquation: string; explanation: string } | null>(null);
  const [hoveredBlankId, setHoveredBlankId] = useState<string | null>(null);

  const blankIds = useMemo(() => {
    if (!template) return [];
    return [
      ...template.reactants.map((_, i) => `reactant-${i}`),
      ...template.products.map((_, i) => `product-${i}`),
    ];
  }, [template]);

  const handleDropped = (value: number, blankId: string) => {
    if (!blankIds.includes(blankId)) return;
    setAssignments((prev) => ({ ...prev, [blankId]: value }));
  };

  const clearBlank = (blankId: string) => {
    setAssignments((prev) => ({ ...prev, [blankId]: null }));
  };

  const allAssigned = blankIds.length > 0 && blankIds.every((id) => assignments[id] != null);

  const handleSubmit = () => {
    if (!template || !allAssigned) return;
    const reactantCoefficients = template.reactants.map((r, i) => ({
      chemicalId: r.chemicalId,
      coefficient: assignments[`reactant-${i}`] as number,
    }));
    const productCoefficient = assignments["product-0"] as number;

    submitMutation.mutate(
      { compoundId, reactantCoefficients, productCoefficient },
      {
        onSuccess: (data) => {
          if (data.correct) {
            setResult({ correct: true });
            setSuccessPayload({ balancedEquation: data.balancedEquation, explanation: data.educationalInfo.explanation });
          } else {
            setResult({ correct: false, hint: data.hint });
          }
        },
      }
    );
  };

  const handleDone = () => {
    onBuilt(compoundId);
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      {/* RN Modal renders into a separate native view hierarchy, outside the root
          GestureHandlerRootView in app/_layout.tsx, so gestures need their own root here. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
        <View className="bg-surface rounded-t-3xl p-5" style={{ maxHeight: "85%" }}>
          <SheetHandle />
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-amedium text-ink">
              {template ? `Build ${template.compound.name}` : "Compound Builder"}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={22} color={colors.primaryBlack} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : isError || !template ? (
            <View className="items-center py-6">
              <Text className="font-amedium text-center mb-3 text-ink">Couldn&apos;t load this compound&apos;s builder.</Text>
              <View className="self-stretch">
                <Button label="Retry" onPress={() => refetch()} variant="secondary" />
              </View>
            </View>
          ) : successPayload ? (
            <View>
              <Animated.View entering={ZoomIn.duration(300)} className="p-4 rounded-2xl bg-emerald-50 shadow-emerald-500/30 mb-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <CheckCircle2 size={18} color="#059669" />
                  <Text className="font-amedium text-emerald-800">{successPayload.balancedEquation}</Text>
                </View>
                <Text className="font-aregular text-emerald-700">{successPayload.explanation}</Text>
              </Animated.View>
              <Button label="Add to bench" onPress={handleDone} variant="success" size="lg" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="font-aregular text-muted mb-4">
                Drag a coefficient onto each blank to balance the equation.
              </Text>

              <View className="flex-row flex-wrap items-center gap-2 mb-6 justify-center">
                {template.reactants.map((r, i) => (
                  <View key={`reactant-row-${i}`} className="flex-row items-center gap-2">
                    {i > 0 && <Text className="text-xl font-amedium text-ink">+</Text>}
                    <BlankBox
                      blankId={`reactant-${i}`}
                      value={assignments[`reactant-${i}`] ?? null}
                      register={register}
                      onClear={() => clearBlank(`reactant-${i}`)}
                      isDropTarget={hoveredBlankId === `reactant-${i}`}
                    />
                    <Text className="text-lg font-amedium text-ink">{r.symbol}</Text>
                  </View>
                ))}

                <Text className="text-xl font-amedium mx-1 text-ink">→</Text>

                {template.products.map((p, i) => (
                  <View key={`product-row-${i}`} className="flex-row items-center gap-2">
                    {i > 0 && <Text className="text-xl font-amedium text-ink">+</Text>}
                    <BlankBox
                      blankId={`product-${i}`}
                      value={assignments[`product-${i}`] ?? null}
                      register={register}
                      onClear={() => clearBlank(`product-${i}`)}
                      isDropTarget={hoveredBlankId === `product-${i}`}
                    />
                    <Text className="text-lg font-amedium text-ink">{p.symbol}</Text>
                  </View>
                ))}
              </View>

              {result && !result.correct && (
                <View className="p-3 rounded-2xl bg-amber-50 mb-4">
                  <Text className="font-amedium text-amber-900">Not quite balanced yet.</Text>
                  <Text className="font-aregular text-amber-800 mt-1">{result.hint}</Text>
                </View>
              )}

              <Text className="font-amedium mb-2 text-ink">Drag a coefficient:</Text>
              <View className="flex-row gap-4 justify-center mb-6">
                {template.coefficientOptions.map((value) => (
                  <DraggableNumberTile
                    key={value}
                    value={value}
                    resolveDropTarget={resolveDropTarget}
                    onDropped={handleDropped}
                    onHoverChange={setHoveredBlankId}
                  />
                ))}
              </View>

              <Button
                label={submitMutation.isPending ? "Checking..." : "Check Equation"}
                onPress={handleSubmit}
                disabled={!allAssigned || submitMutation.isPending}
                size="lg"
              />
            </ScrollView>
          )}
        </View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
