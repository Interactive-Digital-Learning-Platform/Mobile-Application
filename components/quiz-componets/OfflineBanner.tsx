import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { CloudOff, Wifi } from "lucide-react-native";
import { useIsOnline } from "@/hooks/use-online-status";
import { ICON_COLORS } from "@/constants/quizStyles";

const BACK_ONLINE_MS = 2000;

// White-on-orange pill at the top of the Quizzes header: "You're offline" while there's no connection, then a brief
// "Back online" once it returns. Renders nothing the rest of the time.
export default function OfflineBanner() {
  const isOnline = useIsOnline();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOffline = useRef(!isOnline);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setShowBackOnline(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowBackOnline(true);
    const id = setTimeout(() => setShowBackOnline(false), BACK_ONLINE_MS);
    return () => clearTimeout(id);
  }, [isOnline]);

  if (isOnline && !showBackOnline) return null;
  const Icon = isOnline ? Wifi : CloudOff;
  const label = isOnline ? "Back online" : "You're offline · Showing saved stats";

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="flex-row items-center gap-1.5 self-center bg-white/20 rounded-full px-3 py-1.5 mb-3"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
    >
      <Icon size={13} color={ICON_COLORS.white} strokeWidth={2.5} />
      <Text className="text-white text-[12px] font-semibold">{label}</Text>
    </Animated.View>
  );
}
