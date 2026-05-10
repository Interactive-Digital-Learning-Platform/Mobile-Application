import { router } from "expo-router";
import {
  Pressable,
  Text,
  View,
  ScrollView,
  ImageBackground,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Play, Info } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

type VizItem = {
  id: string;
  title: string;
  subject: string;
  grade: string;
  description: string;
  color: string;
  image: string;
};

const VISUALIZATIONS: VizItem[] = [
  {
    id: "photosynthesis",
    title: "Photosynthesis Process",
    subject: "Biology",
    grade: "Grade 6-9",
    description: "Watch how plants convert sunlight into energy.",
    color: "#27AE60",
    image: "https://images.unsplash.com/photo-1501004899824-049c834c90d1?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "water_cycle",
    title: "The Water Cycle",
    subject: "Biology",
    grade: "Grade 6-8",
    description: "Explore evaporation, condensation, and precipitation.",
    color: "#3B82F6",
    image: "https://images.unsplash.com/photo-1534274988757-a28bf1f539cf?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "acid_base",
    title: "Acid-Base Reactions",
    subject: "Chemistry",
    grade: "Grade 9-11",
    description: "Visualize neutralization at a molecular level.",
    color: "#E74C3C",
    image: "https://images.unsplash.com/photo-1603126731744-10048b303482?q=80&w=400&auto=format&fit=crop",
  },
];

export default function VisualizationGallery() {
  return (
    <SafeAreaView className="flex-1 bg-[#f0f5fb]">
      <View className="px-4 py-4 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white justify-center items-center">
          <ChevronLeft size={24} color="#0F172A" />
        </Pressable>
        <Text className="text-[#0F172A] text-xl font-abold">Visualizations</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <Text className="text-[#6B7280] font-aregular text-sm mb-4">
            Interactive scientific animations to help you understand complex concepts.
          </Text>

          {VISUALIZATIONS.map((viz) => (
            <Pressable
              key={viz.id}
              onPress={() => router.push(`/(main)/visualizations/${viz.id}`)}
              className="bg-white rounded-[32px] overflow-hidden mb-6 shadow-sm"
            >
              <ImageBackground
                source={{ uri: viz.image }}
                className="h-48 justify-end"
              >
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.8)"]}
                  className="p-6 h-full justify-end"
                >
                  <View className="flex-row justify-between items-end">
                    <View className="flex-1 mr-4">
                      <View className="bg-white/20 px-2 py-0.5 rounded-md self-start mb-1">
                        <Text className="text-white text-[10px] font-amedium">
                          {viz.subject} • {viz.grade}
                        </Text>
                      </View>
                      <Text className="text-white text-xl font-abold">
                        {viz.title}
                      </Text>
                    </View>
                    <View className="w-12 h-12 rounded-full bg-white justify-center items-center">
                      <Play size={24} color={viz.color} fill={viz.color} />
                    </View>
                  </View>
                </LinearGradient>
              </ImageBackground>
              <View className="p-4 flex-row items-center gap-2">
                <Info size={16} color="#979797" />
                <Text className="text-[#979797] text-xs font-aregular flex-1">
                  {viz.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
