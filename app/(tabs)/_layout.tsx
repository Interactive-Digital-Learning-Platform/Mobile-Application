import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { getFocusedRouteNameFromRoute, type RouteProp } from "@react-navigation/native";
import TabIcon from "@/components/TabIcon";
import icons from "@/constants/icons";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const tabBarStyle = {
    height: Platform.select({
      ios: 64 + insets.bottom,
      android: 64 + insets.bottom,
    }),
    backgroundColor: "white",
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: 12,
    paddingBottom: Platform.select({
      ios: 8 + insets.bottom,
      android: 8 + insets.bottom,
    }),
    borderTopWidth: 1,
    borderColor: "#0000001A",
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#FC6E20",
        tabBarInactiveTintColor: "#d3d2d2ff",
        tabBarStyle: {
          height: Platform.select({
            ios: 64 + insets.bottom,
            android: 64 + insets.bottom,
          }),
          backgroundColor: "#f0f5fb",
          elevation: 0,
          boxShadow: "none",
          paddingTop: 12,
          paddingBottom: Platform.select({
            ios: 8 + insets.bottom,
            android: 8 + insets.bottom,
          }),
          borderTopWidth: 1,
          borderColor: "#0000001A",
        },
      }}
    >
      <Tabs.Screen
        name="ai/index"
        options={{
          title: "Ask",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={focused ? icons.ai_filled : icons.ai_outline}
              color={color}
              name="Ask"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="quiz"
        options={({ route }: { route: RouteProp<Record<string, object | undefined>, string> }) => {
          // The "quiz" tab holds its own nested stack (index, [matchId],
          // quiz-session, quiz-results). Hide the bottom tab bar only while
          // quiz-session is focused, so an active quiz takes the full screen.
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? "index";
          const hideTabBar = focusedRouteName === "quiz-session";

          return {
            title: "Quizzes",
            headerShown: false,
            tabBarStyle: hideTabBar ? { display: "none" as const } : tabBarStyle,
            tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
              <TabIcon
                icon={focused ? icons.brain_filled : icons.brain_outline}
                color={color}
                name="Quizzes"
                focused={focused}
              />
            ),
          };
        }}
      />

      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={focused ? icons.note_filled : icons.note_outline}
              color={color}
              name="Notes"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="lab/index"
        options={{
          title: "Lab",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={focused ? icons.flask_filled : icons.flask_outline}
              color={color}
              name="Lab"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={focused ? icons.profile_filled : icons.profile_outline}
              color={color}
              name="Profile"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
