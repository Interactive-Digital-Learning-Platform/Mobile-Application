import React, { useState } from "react";
import { ActivityIndicator, Image, ImageProps, StyleProp, TouchableOpacity, View, ViewStyle } from "react-native";
import { Text } from "@/components/ui/AppText";
import { useNotesAsset } from "@/hooks/use-notes-asset";
import { colors } from "@/constants/colors";

export default function PrivateNoteImage({ path, ...props }: Omit<ImageProps, "source"> & { path: string }) {
  const { uri, error, retry } = useNotesAsset(path);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (uri && uri !== failedUri) return <Image {...props} source={{ uri }} onError={event => { setFailedUri(uri); props.onError?.(event); }} />;
  return <View style={[props.style as StyleProp<ViewStyle>, { alignItems: "center", justifyContent: "center", gap: 10 }]}>
    {error || (uri && uri === failedUri) ? <><Text style={{ color: "#64748B" }}>Could not load this photo.</Text><TouchableOpacity accessibilityRole="button" onPress={() => { setFailedUri(null); retry(); }} style={{ padding: 12 }}><Text style={{ color: "#9A3412" }}>Try again</Text></TouchableOpacity></> : <ActivityIndicator color={colors.primary} accessibilityLabel="Loading your note photo" />}
  </View>;
}
