import { View } from "react-native";
import { colors } from "@/constants/colors";

export default function SheetHandle() {
  return (
    <View
      style={{
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.borderColorLight,
        alignSelf: "center",
        marginBottom: 12,
      }}
    />
  );
}
