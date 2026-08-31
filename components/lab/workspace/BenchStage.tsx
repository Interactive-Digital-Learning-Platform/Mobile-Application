import { forwardRef, ReactNode } from "react";
import { View } from "react-native";

// A lightweight 2D lab environment built from plain Views + the existing palette — a back wall,
// a work surface with a subtle lip, and a soft ground — so the bench reads as "a laboratory"
// rather than an empty drawing canvas. No image assets. The live bench (LabWorkspace) and any
// floating controls render on top via `children`.
const BenchStage = forwardRef<View, { children: ReactNode; highlighted?: boolean }>(function BenchStage(
  { children, highlighted = false },
  ref
) {
  return (
    <View
      ref={ref}
      style={{
        flex: 1,
        position: "relative",
        backgroundColor: "#eef2fb",
        borderWidth: highlighted ? 2 : 0,
        borderStyle: "dashed",
        borderColor: "#FC6E20",
      }}
    >
      {/* back wall */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: "36%", backgroundColor: "#e6ebf7" }} />
      {/* wall / counter junction */}
      <View style={{ position: "absolute", top: "36%", left: 0, right: 0, height: 1, backgroundColor: "#d3dbef" }} />
      {/* work surface */}
      <View style={{ position: "absolute", top: "36%", left: 0, right: 0, bottom: 0, backgroundColor: "#f5f7fd" }} />
      {/* front lip of the counter — thin highlight over a soft cast shadow */}
      <View style={{ position: "absolute", top: "36%", left: 0, right: 0 }}>
        <View style={{ height: 3, backgroundColor: "#ffffff", opacity: 0.7 }} />
        <View style={{ height: 7, backgroundColor: "#0f172a", opacity: 0.04 }} />
      </View>

      {/* live bench + floating controls */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>{children}</View>
    </View>
  );
});

export default BenchStage;
