import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserSyncMutation } from "@/hooks/use-quiz";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const { mutate: syncUser } = useUserSyncMutation();
  const syncTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isLoaded && isSignedIn) {
      // Best-effort background enrichment: makes sure `users.username` is
      // populated from the Clerk JWT as early as possible, so a brand-new
      // account never shows up as a nameless "Player" the first time it's
      // an opponent in battle mode -- without this, username only ever got
      // self-healed opportunistically, on a Profile tab visit.
      if (!syncTriggeredRef.current) {
        syncTriggeredRef.current = true;
        syncUser(undefined);
      }
      router.replace("/(tabs)/ai");
    } else {
      router.replace("/(auth)/sign-in");
    }
  }, [isLoaded, isSignedIn, syncUser]);

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