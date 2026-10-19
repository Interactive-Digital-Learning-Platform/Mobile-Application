import DeleteChatConfirmation from "@/components/chat/DeleteChatConfirmation";
import { colors } from "@/constants/colors";
import { LucideIcon, Share2, Trash2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { Easing, FadeIn, Keyframe } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from "react-native-svg";

type Props = {
  visible: boolean;
  onClose: () => void;
  // Prepares the share (e.g. creates the link) while the panel stays open with
  // a spinner, and resolves to the action to run once the panel has closed —
  // opening the share sheet, or reporting a failure.
  onShare: () => Promise<() => void>;
  // When set, Share is disabled and this explains why.
  shareDisabledReason?: string;
  // Called once the user confirms; the parent closes the menu when it resolves.
  onDelete: () => void;
  // When set, Delete is disabled and this explains why (e.g. no chat yet, or a
  // reply is still streaming into it).
  deleteDisabledReason?: string;
  isDeleting: boolean;
  chatTitle?: string | null;
};

type MenuOption = {
  key: string;
  label: string;
  icon: LucideIcon;
  onPress?: () => void;
  hint?: string;
  loading?: boolean;
  destructive?: boolean;
  disabled?: boolean;
};

// Matches the header's top padding + icon height in app/(tabs)/ai/index.tsx so
// the panel opens just below the three-dots icon.
const HEADER_OFFSET = 12 + 28 + 10;
const PANEL_WIDTH = 236;
// Same surface treatment as the chat input card, so the panel reads as part of
// the composer's family rather than a generic popover.
const PANEL_RADIUS = 24;
const CORNER_BORDER_WIDTH = 2.5;
const DESTRUCTIVE = "#E11D48";

// Grows out of the three-dots icon (transform origin is the top-right corner).
const panelEntering = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -6 }, { scale: 0.9 }] },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
    easing: Easing.out(Easing.cubic),
  },
}).duration(190);

export default function ChatOptionsMenu({
  visible,
  onClose,
  onShare,
  shareDisabledReason,
  onDelete,
  deleteDisabledReason,
  isDeleting,
  chatTitle,
}: Props) {
  const insets = useSafeAreaInsets();
  const [isConfirmingDelete, setConfirmingDelete] = useState<boolean>(false);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const afterDismissRef = useRef<(() => void) | null>(null);
  const [isPreparingShare, setPreparingShare] = useState<boolean>(false);
  const isBusy = isDeleting || isPreparingShare;

  useEffect(() => {
    if (!visible) setConfirmingDelete(false);
  }, [visible]);

  const handleClose = () => {
    if (isBusy) return;
    onClose();
  };

  // iOS can't present the share sheet while this Modal is still dismissing, so
  // the action waits for onDismiss there; Android has no such restriction.
  const closeThen = (action: () => void) => {
    if (Platform.OS === "ios") {
      afterDismissRef.current = action;
      onClose();
    } else {
      onClose();
      action();
    }
  };

  const handleSharePress = async () => {
    setPreparingShare(true);
    let afterClose: () => void;
    try {
      afterClose = await onShare();
    } finally {
      setPreparingShare(false);
    }
    closeThen(afterClose);
  };

  const handleDismiss = () => {
    const action = afterDismissRef.current;
    afterDismissRef.current = null;
    action?.();
  };

  const options: MenuOption[] = [
    {
      key: "share",
      label: "Share chat",
      icon: Share2,
      onPress: handleSharePress,
      hint: isPreparingShare ? "Creating link…" : shareDisabledReason,
      loading: isPreparingShare,
      disabled: Boolean(shareDisabledReason) || isBusy,
    },
    {
      key: "delete",
      label: "Delete chat",
      icon: Trash2,
      onPress: () => setConfirmingDelete(true),
      hint: deleteDisabledReason,
      destructive: true,
      disabled: Boolean(deleteDisabledReason) || isBusy,
    },
  ];

  const inset = CORNER_BORDER_WIDTH / 2;
  const cornerBorderPath = panelHeight
    ? `M ${PANEL_WIDTH / 2} ${inset} L ${PANEL_WIDTH - PANEL_RADIUS - inset} ${inset} A ${PANEL_RADIUS} ${PANEL_RADIUS} 0 0 1 ${PANEL_WIDTH - inset} ${PANEL_RADIUS + inset} L ${PANEL_WIDTH - inset} ${panelHeight / 2}`
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
      onDismiss={handleDismiss}
    >
      {isConfirmingDelete ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          className="flex-1 justify-center items-center px-6"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.45)" }}
        >
          <DeleteChatConfirmation
            chatTitle={chatTitle}
            isDeleting={isDeleting}
            onCancel={handleClose}
            onConfirm={onDelete}
          />
        </Animated.View>
      ) : (
        <Pressable
          className="flex-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.12)" }}
          onPress={handleClose}
          accessibilityLabel="Close chat options"
        >
          <Animated.View
            entering={panelEntering}
            onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
            onStartShouldSetResponder={() => true}
            style={{
              position: "absolute",
              top: insets.top + HEADER_OFFSET,
              right: 16,
              width: PANEL_WIDTH,
              transformOrigin: "top right",
              borderRadius: PANEL_RADIUS,
              backgroundColor: "#F2F2F2",
              borderWidth: 1.5,
              borderColor: "#FFFFFF",
              padding: 8,
              gap: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.1,
              shadowRadius: 14,
              elevation: 6,
            }}
          >
            {options.map((option) => (
              <MenuRow key={option.key} option={option} />
            ))}

            {cornerBorderPath && (
              <View
                pointerEvents="none"
                style={{ position: "absolute", top: -1.5, left: -1.5 }}
              >
                <Svg width={PANEL_WIDTH} height={panelHeight!}>
                  <Defs>
                    <SvgLinearGradient
                      id="menuCornerBorder"
                      gradientUnits="userSpaceOnUse"
                      x1={PANEL_WIDTH}
                      y1={0}
                      x2={PANEL_WIDTH - 80}
                      y2={80}
                    >
                      <Stop
                        offset="0"
                        stopColor={colors.primary}
                        stopOpacity={1}
                      />
                      <Stop
                        offset="1"
                        stopColor={colors.primary}
                        stopOpacity={0}
                      />
                    </SvgLinearGradient>
                  </Defs>
                  <Path
                    d={cornerBorderPath}
                    stroke="url(#menuCornerBorder)"
                    strokeWidth={CORNER_BORDER_WIDTH}
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
              </View>
            )}
          </Animated.View>
        </Pressable>
      )}
    </Modal>
  );
}

function MenuRow({ option }: { option: MenuOption }) {
  const Icon = option.icon;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={option.label}
      accessibilityHint={option.hint}
      accessibilityState={{ disabled: option.disabled, busy: option.loading }}
      activeOpacity={0.6}
      disabled={option.disabled}
      onPress={option.onPress}
      style={[
        styles.row,
        option.disabled && !option.loading && styles.rowDisabled,
      ]}
    >
      <View
        style={[
          styles.iconTile,
          option.destructive && styles.iconTileDestructive,
        ]}
      >
        {option.loading ? (
          <ActivityIndicator size="small" color="#6B7280" />
        ) : (
          <Icon
            size={18}
            color={option.destructive ? DESTRUCTIVE : "#6B7280"}
          />
        )}
      </View>

      <View style={styles.rowText}>
        <Text
          numberOfLines={1}
          style={[styles.label, option.destructive && styles.labelDestructive]}
        >
          {option.label}
        </Text>
        {option.hint && (
          <Text numberOfLines={1} style={styles.hint}>
            {option.hint}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Rows use StyleSheet rather than className so the icon + label layout applies
// reliably (a Pressable style function was being dropped here).
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  iconTileDestructive: {
    backgroundColor: "#FFE4E6",
  },
  rowText: {
    flex: 1,
    justifyContent: "center",
  },
  label: {
    color: "#0F172A",
    fontFamily: "Author-Medium",
    fontSize: 16,
    lineHeight: 20,
  },
  labelDestructive: {
    color: DESTRUCTIVE,
  },
  hint: {
    color: "#6B7280",
    fontFamily: "Author-Regular",
    fontSize: 12,
    lineHeight: 16,
  },
});
