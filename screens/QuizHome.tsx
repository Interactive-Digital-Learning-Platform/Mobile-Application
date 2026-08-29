import StatisticButton from "@/components/quiz-componets/StatisticButton";
import ModeSwitcher, { QuizMode } from "@/components/quiz-componets/ModeSwitcher";
import PracticeList from "@/components/quiz-componets/PracticeList";
import OnlineList from "@/components/quiz-componets/OnlineList";
import { Text, View, Image, TouchableOpacity } from "react-native";
import { useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { useUser } from "@clerk/expo";
import {
    SafeAreaView,
} from "react-native-safe-area-context";
import { User } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

export default function QuizHome() {
  const [mode, setMode] = useState<QuizMode>("practice");
  const { user } = useUser();
  const displayName = user?.username ?? "...";

  return (
    <SafeAreaView edges={["top"]} className="w-full bg-primary">

      <View className="justify-start items-center flex w-full bg-white h-[30%]">
        <View className="justify-between items-center bg-primary  flex-row  w-full px-[30px]">
          <View className="flex justify-center items-start w-[70%] h-[50%] flex-col ">
              <Text className="text-white text-2xl  font-bold">Hi {displayName}</Text>
              <Text className="text-white font-normal">Welcome to the Quiz</Text>
          </View>
          <View className=" h-[70px] w-[70px] rounded-full bg-white/20 border-2 border-white/40 items-center justify-center">
            <User size={26} color={ICON_COLORS.white} strokeWidth={1.8} />
          </View>
        </View>
        <View className="h-[60%] w-full bg-primary rounded-b-[40px] justify-center items-center px-[30px]">
          <StatisticButton mode={mode} />
        </View>
      </View>

      <View className="justify-start items-center bg-white h-[70%] pt-3">
        <ModeSwitcher mode={mode} onModeChange={setMode} />
        <Animated.View key={mode} entering={FadeIn.duration(250)} className="flex-1 w-full">
          {mode === "practice" ? <PracticeList /> : <OnlineList />}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
