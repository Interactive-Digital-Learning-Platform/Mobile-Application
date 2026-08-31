import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { X } from "lucide-react-native";
import { ReactNode, useCallback, useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function ChatBottomSheet({
  visible,
  title,
  onClose,
  children,
}: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1 && visible) onClose();
    },
    [visible, onClose],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enablePanDownToClose
      onChange={handleChange}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: "#D1D5DB" }}
      backgroundStyle={{ backgroundColor: "#FFFFFF" }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View className="w-full flex-row justify-between items-center mb-2">
          <Text className="text-lg font-asemibold text-[#0F172A]">{title}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            className="w-8 h-8 rounded-full bg-[#F2F2F2] justify-center items-center"
          >
            <X size={18} color="#6B7280" />
          </Pressable>
        </View>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}
