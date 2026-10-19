import React from "react";
import { ActivityIndicator, Image, ImageProps, StyleProp, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { useNotesAsset } from "@/hooks/use-notes-asset";
import { colors } from "@/constants/colors";

export default function PrivateNoteImage({ path, ...props }: Omit<ImageProps, "source"> & { path: string }) {
  const { uri, error, retry } = useNotesAsset(path);
  if (uri) return <Image {...props} source={{ uri }} />;
  return <View style={[props.style as StyleProp<ViewStyle>, { alignItems: "center", justifyContent: "center", gap: 10 }]}>
    {error ? <><Text style={{ color: "#64748B" }}>Could not load this photo.</Text><TouchableOpacity accessibilityRole="button" onPress={retry} style={{ padding: 12 }}><Text style={{ color: "#9A3412" }}>Try again</Text></TouchableOpacity></> : <ActivityIndicator color={colors.primary} accessibilityLabel="Loading your note photo" />}
  </View>;
}
