import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AlertTriangle, CheckCircle2, FlaskConical, ShieldAlert } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { LAB_EQUIPMENT_CATALOG } from "@/constants/lab/equipment.constants";
import { useExperimentInfo } from "@/hooks/lab/use-experiments";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const BulletList = ({ items }: { items: string[] }) => (
  <View className="gap-2">
    {items.map((item, index) => (
      <View key={index} className="flex-row items-start gap-2">
        <View className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: colors.primary }} />
        <Text className="flex-1 font-aregular text-ink">{item}</Text>
      </View>
    ))}
  </View>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="mb-6">
    <Text className="text-base font-amedium text-ink mb-2">{title}</Text>
    {children}
  </View>
);

export default function PracticalInfo() {
  const { experimentId } = useLocalSearchParams<{ experimentId: string }>();
  const { data: info, isLoading, isError } = useExperimentInfo(experimentId);

  if (isLoading) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["top", "bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isError || !info) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["top", "bottom"]}>
        <Text className="text-lg font-amedium text-center text-ink">Couldn&apos;t reach the server</Text>
        <Text className="font-aregular text-muted text-center mt-2">Check your connection and try again.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["top", "bottom"]}>
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3 mb-2">
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: `${info.thumbnailColor}22` }}
          >
            <FlaskConical size={22} color={info.thumbnailColor} />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-amedium text-ink">{info.title}</Text>
            <Text className="font-aregular text-muted text-sm mt-0.5">{info.lesson}</Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2 mb-5">
          <Badge label={info.subject} tone="primary" />
          <Badge label={`Grade ${info.grades.join(", ")}`} tone="neutral" />
          <Badge label={`${info.estimatedTime} min`} tone="neutral" />
        </View>

        <Text className="font-aregular text-ink mb-6">{info.description}</Text>

        <Section title="Learning Outcomes">
          <BulletList items={info.objectives} />
        </Section>

        {!!info.theory && (
          <Section title="Theory">
            <View className="p-4 rounded-2xl bg-bg-soft">
              <Text className="font-aregular text-ink leading-6">{info.theory}</Text>
            </View>
          </Section>
        )}

        {info.keyConcepts.length > 0 && (
          <Section title="Key Concepts">
            <BulletList items={info.keyConcepts} />
          </Section>
        )}

        <Section title="Required Equipment">
          <View className="flex-row flex-wrap gap-2">
            {info.requiredEquipment.map((key) => {
              const item = LAB_EQUIPMENT_CATALOG.find((e) => e.key === key);
              return <Badge key={key} label={item?.label ?? key} tone="neutral" />;
            })}
          </View>
        </Section>

        <Section title="Required Chemicals">
          <View className="gap-2">
            {info.requiredChemicals.map(({ chemical, quantity, unit }) => (
              <View key={chemical._id} className="flex-row items-center justify-between p-3 rounded-2xl bg-bg-soft">
                <View className="flex-1">
                  <Text className="font-amedium text-ink">
                    {chemical.name} {chemical.formula ? `(${chemical.formula})` : ""}
                  </Text>
                  {quantity != null && (
                    <Text className="font-aregular text-muted text-sm mt-0.5">
                      {quantity} {unit ?? ""}
                    </Text>
                  )}
                </View>
                {chemical.safetyClassification !== "safe" && (
                  <Badge label={chemical.safetyClassification} tone="warning" icon={ShieldAlert} />
                )}
              </View>
            ))}
          </View>
        </Section>

        <Section title="Expected Observations">
          <View className="gap-2">
            {info.expectedObservations.map((observation, index) => (
              <View key={index} className="flex-row items-start gap-2">
                <CheckCircle2 size={16} color="#059669" style={{ marginTop: 2 }} />
                <Text className="flex-1 font-aregular text-ink">{observation}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Safety Precautions">
          <View className="p-4 rounded-2xl bg-amber-50 gap-2">
            {info.safetyInformation.map((note, index) => (
              <View key={index} className="flex-row items-start gap-2">
                <AlertTriangle size={16} color="#B45309" style={{ marginTop: 2 }} />
                <Text className="flex-1 font-aregular text-amber-900">{note}</Text>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>

      <View className="p-4">
        <Button
          label="Start Experiment"
          icon={FlaskConical}
          iconPosition="right"
          onPress={() => router.push(`/(tabs)/lab/${experimentId}/equipment` as never)}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
