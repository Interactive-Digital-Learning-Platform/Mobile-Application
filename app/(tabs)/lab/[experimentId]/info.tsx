import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertTriangle,
  ArrowRight,
  Beaker,
  BookOpen,
  CheckCircle2,
  Clock3,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  PackageOpen,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { experimentIcon, formatGradeRange } from "@/constants/lab/experiment.constants";
import { LAB_EQUIPMENT_CATALOG } from "@/constants/lab/equipment.constants";
import { useExperimentInfo } from "@/hooks/lab/use-experiments";
import LabHeader from "@/components/lab/LabHeader";
import DifficultyBadge from "@/components/quiz-componets/DifficultyBadge";

type LearnTab = "overview" | "materials" | "safety";

const LEARN_TABS: { key: LearnTab; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: Sparkles },
  { key: "materials", label: "Materials", icon: PackageOpen },
  { key: "safety", label: "Safety", icon: ShieldCheck },
];

function SectionHeading({ title, subtitle, icon: Icon, color }: { title: string; subtitle?: string; icon: LucideIcon; color: string }) {
  return (
    <View className="mb-2.5 mt-1 flex-row items-center gap-2.5">
      <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18` }}>
        <Icon size={16} color={color} strokeWidth={2.3} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-black text-slate-800">{title}</Text>
        {!!subtitle && <Text className="text-[10px] font-medium text-slate-400">{subtitle}</Text>}
      </View>
    </View>
  );
}

function LearnTabSwitcher({ value, onChange }: { value: LearnTab; onChange: (tab: LearnTab) => void }) {
  return (
    <View className="flex-row rounded-[26px] bg-slate-100 p-1 shadow-sm shadow-black/5">
      {LEARN_TABS.map((tab) => {
        const active = value === tab.key;
        const Icon = tab.icon;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            className={`h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-[22px] ${active ? "bg-primary" : ""}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Icon size={14} color={active ? ICON_COLORS.white : ICON_COLORS.slate400} strokeWidth={2.5} />
            <Text className={`text-[11px] font-black ${active ? "text-white" : "text-slate-400"}`}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MetricTile({ value, label, icon: Icon }: { value: string | number; label: string; icon: LucideIcon }) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-slate-50 px-1 py-3">
      <Icon size={16} color={ICON_COLORS.primary500} strokeWidth={2.2} />
      <Text className="mt-1 text-base font-black text-slate-800">{value}</Text>
      <Text className="mt-0.5 text-center text-[9px] font-semibold text-slate-400">{label}</Text>
    </View>
  );
}

function TheoryCard({ theory }: { theory: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = theory.length > 260;

  return (
    <View className="rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-blue-500">
          <Lightbulb size={18} color={ICON_COLORS.white} strokeWidth={2.1} />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-black text-slate-800">Theory made simple</Text>
          <Text className="text-[10px] font-medium text-slate-500">The idea behind the experiment</Text>
        </View>
      </View>
      <Text className="text-[13px] leading-5 text-slate-600" numberOfLines={expanded ? undefined : 5}>
        {theory}
      </Text>
      {isLong && (
        <Pressable className="mt-2 min-h-[36px] justify-center self-start" onPress={() => setExpanded((value) => !value)}>
          <Text className="text-[12px] font-black text-blue-600">{expanded ? "Show less" : "Read full theory"}</Text>
        </Pressable>
      )}
    </View>
  );
}

function OverviewTab({ objectives, theory, keyConcepts }: { objectives: string[]; theory: string; keyConcepts: string[] }) {
  return (
    <View className="gap-4 pt-4">
      {objectives.length > 0 && (
        <View>
          <SectionHeading title="Your learning mission" subtitle="What you will understand" icon={Target} color={ICON_COLORS.primary500} />
          <View className="gap-2">
            {objectives.map((objective, index) => (
              <View key={`${objective}-${index}`} className="flex-row items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3.5">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Text className="text-[11px] font-black text-primary">{index + 1}</Text>
                </View>
                <Text className="flex-1 text-[13px] leading-5 text-slate-700">{objective}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {!!theory && (
        <View>
          <SectionHeading title="Learn the idea" subtitle="Read before entering the lab" icon={BookOpen} color={ICON_COLORS.blue500} />
          <TheoryCard theory={theory} />
        </View>
      )}

      {keyConcepts.length > 0 && (
        <View>
          <SectionHeading title="Key concepts" subtitle="Remember these during the practical" icon={Sparkles} color={"#7C3AED"} />
          <View className="flex-row flex-wrap gap-2">
            {keyConcepts.map((concept, index) => (
              <View key={`${concept}-${index}`} className="max-w-full flex-row items-start gap-1.5 rounded-2xl bg-violet-50 px-3 py-2">
                <CheckCircle2 size={13} color="#7C3AED" strokeWidth={2.5} style={{ marginTop: 1 }} />
                <Text className="max-w-[290px] text-[12px] font-semibold leading-4 text-violet-800">{concept}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function MaterialsTab({
  equipment,
  chemicals,
}: {
  equipment: string[];
  chemicals: {
    chemical: { _id: string; name: string; formula: string | null; safetyClassification: string };
    quantity: number | null;
    unit: string | null;
  }[];
}) {
  return (
    <View className="gap-4 pt-4">
      <View>
        <SectionHeading title="Equipment kit" subtitle={`${equipment.length} items to recognize`} icon={PackageOpen} color={ICON_COLORS.blue500} />
        <View className="flex-row flex-wrap gap-2">
          {equipment.map((key) => {
            const item = LAB_EQUIPMENT_CATALOG.find((equipmentItem) => equipmentItem.key === key);
            return (
              <View key={key} className="min-h-[64px] min-w-[47%] flex-1 flex-row items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-3">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                  <FlaskConical size={17} color={ICON_COLORS.blue500} strokeWidth={1.9} />
                </View>
                <Text className="flex-1 text-[12px] font-bold text-slate-700">{item?.label ?? key}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View>
        <SectionHeading title="Chemicals" subtitle={`${chemicals.length} materials used`} icon={Beaker} color={ICON_COLORS.primary500} />
        <View className="gap-2">
          {chemicals.map(({ chemical, quantity, unit }) => {
            const needsCare = chemical.safetyClassification !== "safe";
            return (
              <View key={chemical._id} className="flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5">
                <View className={`h-11 w-11 items-center justify-center rounded-xl ${needsCare ? "bg-amber-50" : "bg-emerald-50"}`}>
                  <Beaker size={19} color={needsCare ? ICON_COLORS.amber600 : ICON_COLORS.emerald600} strokeWidth={1.9} />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-black text-slate-800">
                    {chemical.name} {chemical.formula ? `(${chemical.formula})` : ""}
                  </Text>
                  {quantity != null && <Text className="mt-0.5 text-[11px] text-slate-500">{quantity} {unit ?? ""}</Text>}
                </View>
                <View className={`rounded-full px-2 py-1 ${needsCare ? "bg-amber-100" : "bg-emerald-100"}`}>
                  <Text className={`text-[9px] font-black uppercase ${needsCare ? "text-amber-700" : "text-emerald-700"}`}>
                    {needsCare ? chemical.safetyClassification : "Safe"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function SafetyTab({ observations, precautions }: { observations: string[]; precautions: string[] }) {
  return (
    <View className="gap-4 pt-4">
      <View>
        <SectionHeading title="What to watch for" subtitle="Expected observations" icon={CheckCircle2} color={ICON_COLORS.emerald600} />
        <View className="gap-2">
          {observations.map((observation, index) => (
            <View key={`${observation}-${index}`} className="flex-row items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-500">
                <CheckCircle2 size={15} color={ICON_COLORS.white} strokeWidth={2.5} />
              </View>
              <Text className="flex-1 text-[13px] leading-5 text-emerald-900">{observation}</Text>
            </View>
          ))}
        </View>
      </View>

      <View>
        <SectionHeading title="Safety checklist" subtitle="Check these before starting" icon={ShieldCheck} color={ICON_COLORS.amber600} />
        <View className="gap-2">
          {precautions.map((note, index) => (
            <View key={`${note}-${index}`} className="flex-row items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle size={15} color={ICON_COLORS.amber600} strokeWidth={2.4} />
              </View>
              <Text className="flex-1 text-[13px] leading-5 text-amber-900">{note}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function PracticalInfo() {
  const { experimentId } = useLocalSearchParams<{ experimentId: string }>();
  const { data: info, isLoading, isError, refetch } = useExperimentInfo(experimentId);
  const [tab, setTab] = useState<LearnTab>("overview");

  if (isLoading) {
    return (
      <SafeAreaView className="w-full flex-1 items-center justify-center bg-slate-50" edges={["top", "bottom"]}>
        <ActivityIndicator color={ICON_COLORS.primary500} />
      </SafeAreaView>
    );
  }

  if (isError || !info) {
    return (
      <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
        <LabHeader title="Learn Before You Experiment" />
        <View className="flex-1 items-center justify-center px-8 pb-16">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <BookOpen size={28} color={ICON_COLORS.rose500} strokeWidth={1.8} />
          </View>
          <Text className="text-center text-base font-black text-slate-800">Couldn&apos;t load this guide</Text>
          <Text className="mb-5 mt-1 text-center text-sm text-slate-500">Check your connection and try again.</Text>
          <TouchableOpacity className="rounded-2xl bg-primary px-6 py-3" activeOpacity={0.85} onPress={() => refetch()}>
            <Text className="text-sm font-black text-white">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ExperimentIcon = experimentIcon(info);
  const gradeLabel = formatGradeRange(info.grades);

  return (
    <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <LabHeader title="Learn Before You Experiment" subtitle="Build confidence before entering the virtual lab." />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 118 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm shadow-black/10">
          <View className="h-1.5" style={{ backgroundColor: info.thumbnailColor }} />
          <View className="p-4">
            <View className="flex-row items-start gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${info.thumbnailColor}18` }}>
                <ExperimentIcon size={26} color={info.thumbnailColor} strokeWidth={1.9} />
              </View>
              <View className="flex-1">
                <Text className="text-[19px] font-black leading-6 text-slate-900">{info.title}</Text>
                <Text className="mt-0.5 text-[12px] font-semibold text-slate-500">{info.lesson}</Text>
              </View>
            </View>

            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={info.difficulty} />
              {!!gradeLabel && (
                <View className="flex-row items-center gap-1 rounded-full bg-blue-50 px-2 py-1">
                  <GraduationCap size={12} color={ICON_COLORS.blue500} strokeWidth={2.2} />
                  <Text className="text-[10px] font-bold text-blue-700">{gradeLabel}</Text>
                </View>
              )}
              <View className="flex-row items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                <Clock3 size={12} color={ICON_COLORS.slate500} strokeWidth={2.2} />
                <Text className="text-[10px] font-bold text-slate-600">{info.estimatedTime} min</Text>
              </View>
            </View>

            <Text className="mt-3 text-[13px] leading-5 text-slate-600">{info.description}</Text>

            <View className="mt-4 flex-row gap-2">
              <MetricTile icon={Target} value={info.objectives.length} label="Learning goals" />
              <MetricTile icon={PackageOpen} value={info.requiredEquipment.length} label="Equipment" />
              <MetricTile icon={Beaker} value={info.requiredChemicals.length} label="Chemicals" />
            </View>
          </View>
        </View>

        <View className="mt-4">
          <LearnTabSwitcher value={tab} onChange={setTab} />
        </View>

        {tab === "overview" && <OverviewTab objectives={info.objectives} theory={info.theory} keyConcepts={info.keyConcepts} />}
        {tab === "materials" && <MaterialsTab equipment={info.requiredEquipment} chemicals={info.requiredChemicals} />}
        {tab === "safety" && <SafetyTab observations={info.expectedObservations} precautions={info.safetyInformation} />}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white px-4 pb-4 pt-3">
        <TouchableOpacity
          className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-sm shadow-primary/30"
          activeOpacity={0.85}
          onPress={() => router.push(`/(tabs)/lab/${experimentId}/equipment` as never)}
        >
          <FlaskConical size={19} color={ICON_COLORS.white} strokeWidth={2.2} />
          <Text className="text-base font-black text-white">Start Experiment</Text>
          <ArrowRight size={18} color={ICON_COLORS.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
