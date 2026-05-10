import { useAuth } from "@/hooks/clerk-mock";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)/ai" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
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
