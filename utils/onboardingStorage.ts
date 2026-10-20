import AsyncStorage from "@react-native-async-storage/async-storage";

// Onboarding shows once per install: the flag lives in AsyncStorage, so it survives sign-out but not an uninstall.
const STORAGE_KEY = "onboarding:seen";

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === "1";
  } catch {
    // Storage unreadable: skip onboarding rather than block the way to sign-in.
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Best effort: worst case the onboarding shows once more.
  }
}
