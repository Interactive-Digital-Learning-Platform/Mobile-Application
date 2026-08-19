import QueryClientProviderCom from "@/providers/QueryClientProviderCom";
import { SplashScreen, Stack } from "expo-router";
import "react-native-reanimated";
import "../global.css";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import "nativewind";
import ClerkProviderCom from "@/providers/ClerkProviderCom";
import LabAuthSyncBoundary from "@/providers/LabAuthSyncBoundary";
import Toast from "react-native-toast-message";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    "Author-Bold": require("@/assets/fonts/Author-Bold.otf"),
    "Author-BoldItalic": require("@/assets/fonts/Author-BoldItalic.otf"),
    "Author-Italic": require("@/assets/fonts/Author-Italic.otf"),
    "Author-Light": require("@/assets/fonts/Author-Light.otf"),
    "Author-Medium": require("@/assets/fonts/Author-Medium.otf"),
    "Author-Regular": require("@/assets/fonts/Author-Regular.otf"),
    "Author-Semibold": require("@/assets/fonts/Author-Semibold.otf"),
    "Author-SemiboldItalic": require("@/assets/fonts/Author-SemiboldItalic.otf"),
  });

  useEffect(() => {
    if (error) throw error;

    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded) {
    return null;
  }

  if (!fontsLoaded && !error) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProviderCom>
           <ClerkProviderCom>
            <LabAuthSyncBoundary>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(main)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
              </Stack>
              <Toast />
            </LabAuthSyncBoundary>
           </ClerkProviderCom>
        </QueryClientProviderCom>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
