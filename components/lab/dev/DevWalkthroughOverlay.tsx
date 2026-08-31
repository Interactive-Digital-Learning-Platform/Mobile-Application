import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import {
  BookOpenCheck,
  ChevronRight,
  FlaskConical,
  Gauge,
  MapPin,
  Wrench,
  X,
} from "lucide-react-native";
import { useExperimentWalkthrough } from "@/hooks/lab/use-experiments";
import type {
  WalkthroughChemicalType,
  WalkthroughMicroStepType,
  WalkthroughStepType,
} from "@/types/lab";

// ─────────────────────────────────────────────────────────────────────────────
// DEV ONLY — floating "how do I complete this practical" cheat sheet.
//
// Renders a small amber FAB in the workspace that opens the full solution to the current
// practical: every step and task with its exact answer, expected equipment, expected
// chemicals, transfer spec and target measurement. Meant for developers who are testing /
// debugging practicals without knowing the underlying science.
//
// Returns null unless __DEV__. The data comes from a dev-gated backend endpoint that
// responds 404 in production. Remove this component (+ its route, controller, api fn, hook
// and type) before the app ships — grep "DEV ONLY" / "DevWalkthrough".
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  experimentId: string;
  currentStep: number | null;
  currentMicroStep: number | null;
};

const chemLabel = (c: WalkthroughChemicalType) => {
  const base = c.symbol && c.symbol !== c.name ? `${c.name} (${c.symbol})` : c.name;
  const qty = c.quantity != null ? ` · ${c.quantity}${c.unit ? ` ${c.unit}` : ""}` : "";
  return `${base}${qty}`;
};

function Chips({ items, tone }: { items: string[]; tone: "slate" | "violet" }) {
  if (items.length === 0) return <Text className="text-[12px] text-slate-400 italic">none</Text>;
  const cls =
    tone === "violet"
      ? "bg-violet-50 border-violet-200 text-violet-800"
      : "bg-slate-100 border-slate-200 text-slate-700";
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {items.map((label, i) => (
        <View key={`${label}-${i}`} className={`px-2 py-1 rounded-lg border ${cls}`}>
          <Text className={`text-[11.5px] font-semibold ${cls}`}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function MicroStepRow({
  micro,
  isCurrent,
}: {
  micro: WalkthroughMicroStepType;
  isCurrent: boolean;
}) {
  const equip = micro.expectedEquipment.map((e) => e.name);
  const chems = micro.expectedChemicals.map(chemLabel);
  return (
    <View
      className={`mt-2 p-2.5 rounded-xl border ${
        isCurrent ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200"
      }`}
    >
      <View className="flex-row items-center gap-1.5">
        <View
          className={`w-5 h-5 rounded-full items-center justify-center ${
            isCurrent ? "bg-amber-400" : "bg-slate-200"
          }`}
        >
          <Text className="text-[10px] font-black text-white">{micro.microStepId}</Text>
        </View>
        <Text className="text-[12px] font-bold text-slate-500 flex-1">
          Task {micro.microStepId}
          <Text className="font-medium text-slate-400"> · {micro.expectedIntent}</Text>
        </Text>
        {isCurrent && (
          <View className="flex-row items-center gap-0.5 bg-amber-400 px-1.5 py-0.5 rounded-md">
            <MapPin size={9} color="#fff" />
            <Text className="text-[9px] font-black text-white">HERE</Text>
          </View>
        )}
      </View>

      <Text className="text-[12.5px] text-slate-500 mt-1.5 leading-4">
        <Text className="font-semibold text-slate-600">Student sees: </Text>
        {micro.studentPrompt}
      </Text>

      {!!micro.exactAnswer && (
        <View className="flex-row gap-1 mt-1.5">
          <ChevronRight size={14} color="#059669" style={{ marginTop: 1 }} />
          <Text className="text-[13px] font-bold text-emerald-800 flex-1 leading-4">
            {micro.exactAnswer}
          </Text>
        </View>
      )}

      <View className="mt-2 gap-1">
        {equip.length > 0 && (
          <View className="flex-row items-start gap-1.5">
            <Wrench size={12} color="#64748b" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Chips items={equip} tone="slate" />
            </View>
          </View>
        )}
        {chems.length > 0 && (
          <View className="flex-row items-start gap-1.5">
            <FlaskConical size={12} color="#7c3aed" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Chips items={chems} tone="violet" />
            </View>
          </View>
        )}
      </View>

      {micro.expectedTransfer && (
        <Text className="text-[11.5px] text-slate-500 mt-1.5 leading-4">
          Transfer:{" "}
          {micro.expectedTransfer.instrumentCategory ||
            micro.expectedTransfer.method ||
            "any instrument"}
          {micro.expectedTransfer.sourceChemical
            ? ` — dispense ${micro.expectedTransfer.sourceChemical.name}`
            : ""}
          {micro.expectedTransfer.minDispenses > 1
            ? ` (≥ ${micro.expectedTransfer.minDispenses} drops)`
            : ""}
        </Text>
      )}

      {micro.expectedMeasurement && (
        <View className="flex-row items-center gap-1.5 mt-1.5">
          <Gauge size={12} color="#64748b" />
          <Text className="text-[11.5px] text-slate-500">
            Target {micro.expectedMeasurement.metric}: {micro.expectedMeasurement.expectedValue} (±
            {micro.expectedMeasurement.tolerancePct}%)
          </Text>
        </View>
      )}

      {(micro.requiresReactionCheck || micro.requiresMeasurementCheck) && (
        <Text className="text-[11px] font-semibold text-amber-700 mt-1.5">
          {micro.requiresReactionCheck
            ? "⚗️ Auto-completes when the reaction fires on the bench"
            : "🔢 Needs a typed-in calculated answer"}
        </Text>
      )}
    </View>
  );
}

function StepCard({
  step,
  isCurrent,
  currentMicroStep,
}: {
  step: WalkthroughStepType;
  isCurrent: boolean;
  currentMicroStep: number | null;
}) {
  const equip = step.requiredEquipment.map((e) => e.name);
  const chems = step.requiredChemicals.map(chemLabel);
  return (
    <View
      className={`mt-3 p-3 rounded-2xl border ${
        isCurrent ? "border-amber-400 bg-amber-50/40" : "border-slate-200 bg-white"
      }`}
    >
      <View className="flex-row items-center gap-2">
        <View
          className={`w-6 h-6 rounded-lg items-center justify-center ${
            isCurrent ? "bg-amber-500" : "bg-slate-700"
          }`}
        >
          <Text className="text-[11px] font-black text-white">{step.stepId}</Text>
        </View>
        <Text className="text-[14px] font-black text-slate-800 flex-1">{step.title}</Text>
        <Text className="text-[10px] font-bold uppercase text-slate-400">{step.actionType}</Text>
      </View>

      <Text className="text-[12.5px] text-slate-500 mt-1.5 leading-4">{step.instruction}</Text>

      {!!step.observationGoal && (
        <Text className="text-[12px] text-slate-500 mt-1 leading-4 italic">
          Goal: {step.observationGoal}
        </Text>
      )}

      {(equip.length > 0 || chems.length > 0) && step.microSteps.length === 0 && (
        <View className="mt-2 gap-1.5">
          {equip.length > 0 && <Chips items={equip} tone="slate" />}
          {chems.length > 0 && <Chips items={chems} tone="violet" />}
          {!!step.exactAnswer && (
            <Text className="text-[13px] font-bold text-emerald-800 mt-1 leading-4">
              → {step.exactAnswer}
            </Text>
          )}
        </View>
      )}

      {step.microSteps.map((m) => (
        <MicroStepRow
          key={m.microStepId}
          micro={m}
          isCurrent={isCurrent && currentMicroStep === m.microStepId}
        />
      ))}
    </View>
  );
}

export default function DevWalkthroughOverlay({ experimentId, currentStep, currentMicroStep }: Props) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, error } = useExperimentWalkthrough(experimentId);

  const errorMessage = useMemo(() => {
    // The endpoint 404s in production — surface that plainly rather than as a generic failure.
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return "Walkthrough endpoint is disabled (production build or ENABLE_DEV_WALKTHROUGH not set).";
    return "Couldn't load the walkthrough.";
  }, [error]);

  if (!__DEV__) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ position: "absolute", right: 12, bottom: 92, elevation: 6 }}
        className="flex-row items-center gap-1.5 bg-amber-500 px-3 py-2 rounded-full shadow-lg active:opacity-80"
      >
        <BookOpenCheck size={15} color="#fff" />
        <Text className="text-[11px] font-black text-white tracking-wide">DEV · STEPS</Text>
      </Pressable>

      <Modal transparent animationType="slide" visible={open} onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.55)" }}>
          <View className="bg-slate-50 rounded-t-3xl" style={{ maxHeight: "88%" }}>
            <View className="flex-row items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-200">
              <View className="bg-amber-100 px-2 py-1 rounded-md">
                <Text className="text-[10px] font-black text-amber-700">DEV ONLY</Text>
              </View>
              <Text className="text-[15px] font-black text-slate-800 flex-1" numberOfLines={1}>
                {data?.title ?? "Walkthrough"}
              </Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} className="p-1">
                <X size={20} color="#334155" />
              </Pressable>
            </View>

            <ScrollView className="px-4" contentContainerStyle={{ paddingVertical: 12, paddingBottom: 32 }}>
              {isLoading && (
                <View className="py-10 items-center">
                  <ActivityIndicator color="#f59e0b" />
                </View>
              )}

              {isError && (
                <View className="py-8 px-2">
                  <Text className="text-[13px] font-semibold text-slate-600 text-center">
                    {errorMessage}
                  </Text>
                </View>
              )}

              {data && (
                <>
                  <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {data.subject} · {data.difficulty}
                  </Text>

                  <View className="mt-2 p-3 rounded-2xl bg-white border border-slate-200">
                    <Text className="text-[12px] font-black text-slate-700 mb-1.5">Setup — bring these in</Text>
                    <Text className="text-[11px] font-bold text-slate-400 mb-1">Equipment</Text>
                    <Chips items={data.requiredEquipment.map((e) => e.name)} tone="slate" />
                    {data.optionalEquipment.length > 0 && (
                      <>
                        <Text className="text-[11px] font-bold text-slate-400 mt-2 mb-1">Optional equipment</Text>
                        <Chips items={data.optionalEquipment.map((e) => e.name)} tone="slate" />
                      </>
                    )}
                    <Text className="text-[11px] font-bold text-slate-400 mt-2 mb-1">Chemicals / materials</Text>
                    <Chips items={data.requiredChemicals.map(chemLabel)} tone="violet" />
                  </View>

                  {data.steps.map((s) => (
                    <StepCard
                      key={s.stepId}
                      step={s}
                      isCurrent={currentStep === s.stepId}
                      currentMicroStep={currentMicroStep}
                    />
                  ))}

                  {data.expectedObservations.length > 0 && (
                    <View className="mt-3 p-3 rounded-2xl bg-white border border-slate-200">
                      <Text className="text-[12px] font-black text-slate-700 mb-1.5">Expected observations</Text>
                      {data.expectedObservations.map((o, i) => (
                        <Text key={i} className="text-[12px] text-slate-500 leading-4 mt-0.5">
                          • {o}
                        </Text>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
