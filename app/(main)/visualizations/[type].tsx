import React, { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  Pressable,
  Text,
  View,
  Dimensions,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, RotateCcw, Play, Pause } from "lucide-react-native";
import { Canvas, Circle, Group, Rect, vec, LinearGradient as SkiaGradient } from "@shopify/react-native-skia";
import Animated, { useSharedValue, withRepeat, withTiming, withSequence, Easing, cancelAnimation } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

export default function VisualizationDetail() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Animation values
  const sunRotation = useSharedValue(0);
  const lightOpacity = useSharedValue(0.2);
  const particleY = useSharedValue(0);

  useEffect(() => {
    if (isPlaying) {
      sunRotation.value = withRepeat(
        withTiming(360, { duration: 10000, easing: Easing.linear }),
        -1,
        false
      );
      lightOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500 }),
          withTiming(0.2, { duration: 1500 })
        ),
        -1,
        true
      );
      particleY.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        -1,
        false
      );
    } else {
      cancelAnimation(sunRotation);
      cancelAnimation(lightOpacity);
      cancelAnimation(particleY);
    }
  }, [isPlaying]);

  const renderContent = () => {
    switch (type) {
      case "photosynthesis":
        return <PhotosynthesisAnimation lightOpacity={lightOpacity} particleY={particleY} />;
      case "water_cycle":
        return <WaterCycleAnimation particleY={particleY} />;
      default:
        return <Text className="text-center mt-10">Coming soon...</Text>;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f0f5fb]">
      <View className="px-4 py-4 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white justify-center items-center">
          <ChevronLeft size={24} color="#0F172A" />
        </Pressable>
        <Text className="text-[#0F172A] text-xl font-abold capitalize">
          {type?.replace("_", " ")}
        </Text>
        <Pressable onPress={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full bg-white justify-center items-center">
          {isPlaying ? <Pause size={20} color="#FC6E20" /> : <Play size={20} color="#FC6E20" fill="#FC6E20" />}
        </Pressable>
      </View>

      <View className="flex-1 mx-4 bg-white rounded-[40px] shadow-sm overflow-hidden mb-4">
        {renderContent()}
      </View>

      {/* Control Panel */}
      <View className="bg-white mx-4 rounded-3xl p-6 mb-8 shadow-sm">
        <Text className="text-[#0F172A] font-abold text-lg mb-2">How it works</Text>
        <Text className="text-[#6B7280] font-aregular text-sm leading-5">
          {type === "photosynthesis" 
            ? "Plants take in Carbon Dioxide (CO₂) and Water (H₂O) and use Sunlight energy to create Glucose (Sugar) and Oxygen (O₂). The green Chlorophyll captures the light."
            : "Water evaporates from oceans, forms clouds (condensation), and falls back to Earth as rain (precipitation), repeating the cycle endlessly."}
        </Text>
        
        <View className="flex-row gap-4 mt-6">
          <Pressable className="flex-1 bg-[#F0F5FB] h-12 rounded-2xl justify-center items-center flex-row gap-2">
            <RotateCcw size={18} color="#6B7280" />
            <Text className="text-[#6B7280] font-amedium">Reset</Text>
          </Pressable>
          <Pressable className="flex-1 bg-[#FC6E20] h-12 rounded-2xl justify-center items-center">
            <Text className="text-white font-amedium">Next Chapter</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function PhotosynthesisAnimation({ lightOpacity, particleY }: any) {
  return (
    <Canvas style={{ flex: 1 }}>
      {/* Background Sky */}
      <Rect x={0} y={0} width={width} height={height} color="#E0F2FE">
         <SkiaGradient
            start={vec(0, 0)}
            end={vec(0, 400)}
            colors={["#BAE6FD", "#FFFFFF"]}
          />
      </Rect>

      {/* Sun */}
      <Group>
        <Circle cx={width - 80} cy={80} r={40} color="#FDE047" opacity={0.8} />
        <Circle cx={width - 80} cy={80} r={50} color="#FDE047" opacity={0.2} />
      </Group>

      {/* Light Rays */}
      <Group opacity={lightOpacity}>
        <Rect x={width - 150} y={150} width={2} height={100} color="#FDE047" />
        <Rect x={width - 180} y={140} width={2} height={120} color="#FDE047" />
      </Group>

      {/* Plant Stem */}
      <Rect x={width / 2 - 5} y={height / 2 - 100} width={10} height={250} color="#15803D" />
      
      {/* Leaves */}
      <Circle cx={width / 2 - 40} cy={height / 2} r={30} color="#16A34A" />
      <Circle cx={width / 2 + 40} cy={height / 2 + 20} r={35} color="#16A34A" />

      {/* Ground */}
      <Rect x={0} y={height / 2 + 150} width={width} height={200} color="#78350F" />
    </Canvas>
  );
}

function WaterCycleAnimation({ particleY }: any) {
  return (
    <Canvas style={{ flex: 1 }}>
      <Rect x={0} y={0} width={width} height={height} color="#E0F2FE" />
      
      {/* Ocean */}
      <Rect x={0} y={height / 2 + 50} width={width} height={200} color="#2563EB" />
      
      {/* Clouds */}
      <Group>
        <Circle cx={80} cy={100} r={30} color="white" />
        <Circle cx={120} cy={100} r={40} color="white" />
        <Circle cx={160} cy={100} r={30} color="white" />
      </Group>
    </Canvas>
  );
}
