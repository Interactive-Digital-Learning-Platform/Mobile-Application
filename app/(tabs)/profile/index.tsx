import { useClerk, useUser } from "@/hooks/clerk-mock";
import { router } from "expo-router";
import {
  Pressable,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { fetchMyAnalytics } from "@/services/sessionService";
import {
  LogOut,
  Settings,
  ChevronRight,
  BookOpen,
  Trophy,
  Activity,
  Calendar,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";

const { width } = Dimensions.get("window");

export default function Profile() {
  const { signOut } = useClerk();
  const { user } = useUser();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["my-analytics"],
    queryFn: fetchMyAnalytics,
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Error in signing out!",
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FC6E20" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f0f5fb]">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Profile Section */}
        <LinearGradient
          colors={["#FC6E20", "#FF9F66"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 pt-6 pb-12 rounded-b-[40px]"
        >
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-2xl font-abold">My Profile</Text>
            <Pressable onPress={() => {}}>
              <Settings size={24} color="white" />
            </Pressable>
          </View>

          <View className="flex-row items-center gap-4">
            <View className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 justify-center items-center">
              <Text className="text-white text-3xl font-abold">
                {user?.firstName?.charAt(0) || user?.username?.charAt(0) || "S"}
              </Text>
            </View>
            <View>
              <Text className="text-white text-2xl font-asemibold">
                {user?.firstName || user?.username || "Student"}
              </Text>
              <View className="bg-white/20 px-3 py-1 rounded-full self-start mt-1">
                <Text className="text-white text-xs font-amedium">
                  Grade {analytics?.learningProfile?.grade || 8} • Science
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View className="flex-row px-4 -mt-8 gap-3">
          <View className="flex-1 bg-white rounded-3xl p-4 shadow-sm items-center">
            <View className="w-10 h-10 rounded-2xl bg-blue-50 justify-center items-center mb-2">
              <BookOpen size={20} color="#3B82F6" />
            </View>
            <Text className="text-[#0F172A] text-lg font-abold">
              {analytics?.totalSessions || 0}
            </Text>
            <Text className="text-[#979797] text-xs font-amedium">Labs Done</Text>
          </View>

          <View className="flex-1 bg-white rounded-3xl p-4 shadow-sm items-center">
            <View className="w-10 h-10 rounded-2xl bg-orange-50 justify-center items-center mb-2">
              <Trophy size={20} color="#FC6E20" />
            </View>
            <Text className="text-[#0F172A] text-lg font-abold">
              {analytics?.averageScore || 0}%
            </Text>
            <Text className="text-[#979797] text-xs font-amedium">Avg. Score</Text>
          </View>

          <View className="flex-1 bg-white rounded-3xl p-4 shadow-sm items-center">
            <View className="w-10 h-10 rounded-2xl bg-green-50 justify-center items-center mb-2">
              <Activity size={20} color="#10B981" />
            </View>
            <Text className="text-[#0F172A] text-lg font-abold">
              {analytics?.learningProfile?.streakDays || 0}
            </Text>
            <Text className="text-[#979797] text-xs font-amedium">Day Streak</Text>
          </View>
        </View>

        {/* Concept Mastery Section */}
        <View className="px-4 mt-6">
          <Text className="text-[#0F172A] text-lg font-abold mb-3">Concept Mastery</Text>
          <View className="bg-white rounded-3xl p-5 shadow-sm">
            {Object.keys(analytics?.subjectBreakdown || {}).length > 0 ? (
              Object.entries(analytics.subjectBreakdown).map(([subject, data]: [string, any], index) => (
                <View key={subject} className={index !== 0 ? "mt-4" : ""}>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-[#374151] font-amedium">{subject}</Text>
                    <Text className="text-[#FC6E20] font-abold">{data.avgScore}%</Text>
                  </View>
                  <View className="h-2 bg-[#F0F5FB] rounded-full">
                    <View
                      className="h-2 bg-[#FC6E20] rounded-full"
                      style={{ width: `${data.avgScore}%` }}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-[#979797] text-center font-aregular">
                Complete experiments to see your progress!
              </Text>
            )}
          </View>
        </View>

        {/* Recent Activity */}
        <View className="px-4 mt-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#0F172A] text-lg font-abold">Recent Activity</Text>
            <Pressable>
              <Text className="text-[#FC6E20] font-amedium text-sm">See All</Text>
            </Pressable>
          </View>

          {analytics?.recentSessions?.length > 0 ? (
            analytics.recentSessions.map((session: any) => (
              <Pressable
                key={session.sessionId}
                onPress={() => router.push(`/(main)/experiment/feedback/${session.sessionId}`)}
                className="bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm"
              >
                <View className="w-12 h-12 rounded-2xl bg-[#F0F5FB] justify-center items-center mr-4">
                  <Calendar size={24} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#0F172A] font-asemibold" numberOfLines={1}>
                    {session.experimentTitle}
                  </Text>
                  <Text className="text-[#979797] text-xs font-aregular">
                    {new Date(session.date).toLocaleDateString()} • {session.subject}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[#0F172A] font-abold text-base">{session.score}%</Text>
                  <ChevronRight size={16} color="#D1D5DB" />
                </View>
              </Pressable>
            ))
          ) : (
            <View className="bg-white rounded-3xl p-8 items-center justify-center shadow-sm">
              <Text className="text-[#979797] font-aregular">No recent activity found.</Text>
            </View>
          )}
        </View>

        {/* Account Actions */}
        <View className="px-4 mt-6 mb-12">
          <Text className="text-[#0F172A] text-lg font-abold mb-3">Account</Text>
          <View className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <Pressable
              onPress={handleSignOut}
              className="flex-row items-center justify-between p-5 border-b border-[#F0F5FB]"
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 rounded-2xl bg-red-50 justify-center items-center">
                  <LogOut size={20} color="#EF4444" />
                </View>
                <Text className="text-[#EF4444] font-amedium text-base">Sign Out</Text>
              </View>
              <ChevronRight size={20} color="#D1D5DB" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
