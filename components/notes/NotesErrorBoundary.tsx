import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "@/constants/colors";

/** Last resort for rendering failures inside Notes, never the other app tabs.
 * Async actions must still catch their own failures. Retry remounts this subtree. */
export default class NotesErrorBoundary extends React.Component<{
  children: React.ReactNode; onBack?: () => void;
}, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <View style={s.screen}>
      <Text style={s.title}>{"Let's try that again"}</Text>
      <Text accessibilityRole="alert" style={s.body}>{"We couldn't show this Notes screen. Please try again in a moment."}</Text>
      <TouchableOpacity accessibilityRole="button" style={s.button} onPress={() => this.setState(state => ({ failed: false, attempt: state.attempt + 1 }))}><Text style={s.action}>Try again</Text></TouchableOpacity>
      {this.props.onBack && <TouchableOpacity accessibilityRole="button" style={s.button} onPress={this.props.onBack}><Text style={s.action}>Back to Notes</Text></TouchableOpacity>}
    </View>;
    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}
const s = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", padding: 28 },
  title: { color: "#1E293B", fontSize: 22, fontWeight: "700", marginBottom: 12 },
  body: { color: "#475569", fontSize: 15, lineHeight: 23, textAlign: "center", maxWidth: 360 },
  button: { padding: 16, marginTop: 12 }, action: { color: colors.primary, fontWeight: "700", fontSize: 16 },
});
