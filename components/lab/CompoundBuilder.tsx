import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { X } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useDropTargetRegistry } from "@/hooks/use-drop-target-registry";
import { useCompoundBuildTemplate, useSubmitCompoundBuild } from "@/hooks/use-compound-builder";

type RegisterFn = ReturnType<typeof useDropTargetRegistry>["register"];

type Props = {
  experimentId: string;
  sessionId: string;
  compoundId: string;
  onClose: () => void;
  onBuilt: (compoundId: string) => void;
};

// Reuses the same Gesture.Pan + drop-target-registry hit-testing pattern as ChemicalBottle.tsx
// (dragging a chemical onto equipment), applied here to dragging a coefficient onto a blank in
// the equation instead of a chemical onto a piece of equipment.
const DraggableNumberTile = ({
  value,
  resolveDropTarget,
  onDropped,
}: {
  value: number;
  resolveDropTarget: (x: number, y: number) => Promise<string | null>;
  onDropped: (value: number, blankId: string) => void;
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const handleDrop = async (x: number, y: number) => {
    const targetId = await resolveDropTarget(x, y);
    if (targetId) onDropped(value, targetId);
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
}: {
  blankId: string;
  value: number | null;
  register: RegisterFn;
  onClear: () => void;
}) => (
  <View ref={register(blankId)}>
    <Pressable onPress={value != null ? onClear : undefined}>
      <View
        className="w-11 h-11 rounded-lg items-center justify-center border-2"
        style={{ borderColor: value != null ? colors.primary : colors.borderColorLight, borderStyle: value != null ? "solid" : "dashed" }}
      >
        <Text className="font-amedium text-base" style={{ color: value != null ? colors.primary : "#979797" }}>
          {value ?? "?"}
        </Text>
      </View>
    </Pressable>
  </View>
);

export default function CompoundBuilder({ experimentId, sessionId, compoundId, onClose, onBuilt }: Props) {
  const { data: template, isLoading, isError, refetch } = useCompoundBuildTemplate(experimentId, compoundId);
  const submitMutation = useSubmitCompoundBuild(sessionId);
  const { register, resolveDropTarget } = useDropTargetRegistry();

  const [assignments, setAssignments] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<{ correct: boolean; hint?: string } | null>(null);
  const [successPayload, setSuccessPayload] = useState<{ balancedEquation: string; explanation: string } | null>(null);

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
      <View className="flex-1 justify-end" style={{ backgroundColor: "#00000055" }}>
        <View className="bg-white rounded-t-3xl p-5" style={{ maxHeight: "85%" }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-amedium" style={{ color: colors.primaryBlack }}>
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
              <Text className="font-amedium text-center mb-3" style={{ color: colors.primaryBlack }}>
                Couldn&apos;t load this compound&apos;s builder.
              </Text>
              <Pressable onPress={() => refetch()} className="px-6 py-3 rounded-xl" style={{ backgroundColor: colors.primaryBlack }}>
                <Text className="text-white font-amedium">Retry</Text>
              </Pressable>
            </View>
          ) : successPayload ? (
            <View>
              <View className="p-4 rounded-xl bg-green-50 mb-4">
                <Text className="font-amedium text-green-900 mb-1">{successPayload.balancedEquation}</Text>
                <Text className="font-aregular text-green-800">{successPayload.explanation}</Text>
              </View>
              <Pressable onPress={handleDone} className="py-3 rounded-xl items-center" style={{ backgroundColor: colors.primaryBlack }}>
                <Text className="text-white font-amedium text-lg">Add to bench</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="font-aregular text-[#979797] mb-4">
                Drag a coefficient onto each blank to balance the equation.
              </Text>

              <View className="flex-row flex-wrap items-center gap-2 mb-6 justify-center">
                {template.reactants.map((r, i) => (
                  <View key={`reactant-row-${i}`} className="flex-row items-center gap-2">
                    {i > 0 && (
                      <Text className="text-xl font-amedium" style={{ color: colors.primaryBlack }}>
                        +
                      </Text>
                    )}
                    <BlankBox
                      blankId={`reactant-${i}`}
                      value={assignments[`reactant-${i}`] ?? null}
                      register={register}
                      onClear={() => clearBlank(`reactant-${i}`)}
                    />
                    <Text className="text-lg font-amedium" style={{ color: colors.primaryBlack }}>
                      {r.symbol}
                    </Text>
                  </View>
                ))}

                <Text className="text-xl font-amedium mx-1" style={{ color: colors.primaryBlack }}>
                  →
                </Text>

                {template.products.map((p, i) => (
                  <View key={`product-row-${i}`} className="flex-row items-center gap-2">
                    {i > 0 && (
                      <Text className="text-xl font-amedium" style={{ color: colors.primaryBlack }}>
                        +
                      </Text>
                    )}
                    <BlankBox
                      blankId={`product-${i}`}
                      value={assignments[`product-${i}`] ?? null}
                      register={register}
                      onClear={() => clearBlank(`product-${i}`)}
                    />
                    <Text className="text-lg font-amedium" style={{ color: colors.primaryBlack }}>
                      {p.symbol}
                    </Text>
                  </View>
                ))}
              </View>

              {result && !result.correct && (
                <View className="p-3 rounded-xl bg-amber-50 mb-4">
                  <Text className="font-amedium text-amber-900">Not quite balanced yet.</Text>
                  <Text className="font-aregular text-amber-800 mt-1">{result.hint}</Text>
                </View>
              )}

              <Text className="font-amedium mb-2" style={{ color: colors.primaryBlack }}>
                Drag a coefficient:
              </Text>
              <View className="flex-row gap-4 justify-center mb-6">
                {template.coefficientOptions.map((value) => (
                  <DraggableNumberTile key={value} value={value} resolveDropTarget={resolveDropTarget} onDropped={handleDropped} />
                ))}
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={!allAssigned || submitMutation.isPending}
                className="py-3 rounded-xl items-center"
                style={{ backgroundColor: colors.primaryBlack, opacity: allAssigned ? 1 : 0.5 }}
              >
                <Text className="text-white font-amedium text-lg">
                  {submitMutation.isPending ? "Checking..." : "Check Equation"}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
