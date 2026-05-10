import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tr } from "zod/v4/locales";

export default function Index() {
  // const { isSignedIn, isLoaded } = useAuth();

  let isSignedIn = true;
  let isLoaded = true;

  useEffect(() => {
    if (!isLoaded) return;

    if (isLoaded && isSignedIn) {
      router.replace("/(tabs)/quiz");
    } else {
      router.replace("/(auth)/sign-in");
    }
  }, [isLoaded, isSignedIn]);

  return (
    <SafeAreaView style={styles.root}>
      <ActivityIndicator size="large" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
});
