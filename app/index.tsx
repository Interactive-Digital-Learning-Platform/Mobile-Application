import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View>
        <Text>Index file</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/explore")}>
          <Text className="font-asemibold text-4xl">Navigate Home</Text>
        </TouchableOpacity>
      </View>
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
