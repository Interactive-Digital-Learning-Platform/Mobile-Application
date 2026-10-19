import { View } from "react-native";
import Skeleton from "@/components/Skeleton";

export default function SourceItemSkeleton() {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#E7EDF5",
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Skeleton width={26} height={26} borderRadius={8} color="#E4ECF6" />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="64%" height={13} color="#E4ECF6" />
        <Skeleton width="40%" height={11} color="#EEF3F9" />
      </View>
      <Skeleton width={18} height={18} borderRadius={9} color="#E4ECF6" />
    </View>
  );
}
