import { cssInterop } from "nativewind";
import { createContext, forwardRef, useContext } from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

// Drop-in replacements for react-native's Text / TextInput that always render in the app font (Author, the font the
// AI assistant was designed with). Import these instead of the react-native ones:
//
//   import { Text, TextInput } from "@/components/ui/AppText";
//
// - No font set           -> Author-Regular
// - A weight set          -> the matching Author file (font-bold / fontWeight "700" -> Author-Bold, ...). A custom
//                            font ignores fontWeight on Android and fakes it on iOS, so the weight picks the file.
// - Italic                -> the matching Author italic file
// - An explicit non-Author fontFamily (e.g. monospace for code) is left alone.
// - Text nested in another Text with no weight / italic of its own inherits the parent's font, as react-native does.
// - Text that didn't choose Author itself is enlarged by AUTHOR_SIZE_SCALE (see below); text styled with an Author
//   font explicitly (font-aregular, "Author-Bold", ...) was designed at its size and is left as is.

type Weight = NonNullable<TextStyle["fontWeight"]>;

// Author is drawn smaller than the system fonts (SF / Roboto) at the same size: lowercase letters ~17% shorter and
// text ~10% narrower. Text designed for the system font is scaled up 18%, which matches the old letter height (text
// ends up ~5% wider than before). Everything sized for the system font uses this one number -- here and through
// scaleForAuthor() in charts, markdown, toasts and animated text. React Native's default size is 14.
export const AUTHOR_SIZE_SCALE = 1.18;
const DEFAULT_FONT_SIZE = 14;

export function scaleForAuthor(size: number): number {
  return Math.round(size * AUTHOR_SIZE_SCALE * 2) / 2;
}

// Author ships Light..Bold (no Black): 800/900 use Bold, its heaviest weight.
const UPRIGHT: Record<string, string> = {
  "100": "Author-Light",
  "200": "Author-Light",
  "300": "Author-Light",
  "400": "Author-Regular",
  "500": "Author-Medium",
  "600": "Author-Semibold",
  "700": "Author-Bold",
  "800": "Author-Bold",
  "900": "Author-Bold",
};
// Only these italics are loaded in app/_layout.tsx.
const ITALIC: Record<string, string> = {
  "600": "Author-SemiboldItalic",
  "700": "Author-BoldItalic",
  "800": "Author-BoldItalic",
  "900": "Author-BoldItalic",
};
const NAMED_WEIGHTS: Record<string, string> = {
  normal: "400", regular: "400", ultralight: "200", thin: "100", light: "300",
  medium: "500", semibold: "600", condensed: "400", condensedBold: "700", bold: "700", heavy: "800", black: "900",
};

function weightKey(weight: Weight | undefined): string {
  if (weight == null) return "400";
  const key = String(weight);
  return NAMED_WEIGHTS[key] ?? key;
}

// What the enclosing Text resolved to (null = not nested): its weight, so nested text can inherit it, and whether its
// size was scaled for Author, so nested sizes follow the same rule.
type ParentFont = { weight: string; scaled: boolean };
const ParentFontContext = createContext<ParentFont | null>(null);

function familyWeight(family: string): string {
  const name = family.replace(/^Author-/, "").replace(/Italic$/, "").toLowerCase();
  return NAMED_WEIGHTS[name] ?? "400";
}

export function withAppFont(
  style: StyleProp<TextStyle>,
  parent: ParentFont | null = null,
): { style: TextStyle; font: ParentFont } {
  const flat: TextStyle = { ...(StyleSheet.flatten(style) ?? {}) };
  const family = flat.fontFamily;
  if (family && !family.startsWith("Author")) {
    return { style: flat, font: { weight: weightKey(flat.fontWeight), scaled: false } };
  }
  // Top-level text scales when it didn't pick Author itself; nested text follows its parent.
  const scaled = parent ? parent.scaled : !family;
  if (scaled && flat.fontSize != null) flat.fontSize = scaleForAuthor(flat.fontSize);
  else if (scaled && !parent) flat.fontSize = scaleForAuthor(DEFAULT_FONT_SIZE);
  // (Nested text without its own size inherits the parent's, already scaled.)

  // Nested with no weight / italic of its own: let it inherit the parent's font natively.
  if (!family && parent && flat.fontWeight == null && flat.fontStyle == null) {
    return { style: flat, font: { weight: parent.weight, scaled } };
  }
  if (!family) {
    const key = flat.fontWeight != null ? weightKey(flat.fontWeight) : (parent?.weight ?? "400");
    flat.fontFamily = flat.fontStyle === "italic" ? (ITALIC[key] ?? "Author-Italic") : (UPRIGHT[key] ?? "Author-Regular");
  }
  // Author-* chosen (explicitly or above): the family carries the weight, so drop fontWeight / the italic flag.
  delete flat.fontWeight;
  if (flat.fontFamily?.includes("Italic")) delete flat.fontStyle;
  return { style: flat, font: { weight: familyWeight(flat.fontFamily ?? "Author-Regular"), scaled } };
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...props }, ref) {
  const parent = useContext(ParentFontContext);
  const resolved = withAppFont(style, parent);
  return (
    <ParentFontContext.Provider value={resolved.font}>
      <RNText ref={ref} {...props} style={resolved.style} />
    </ParentFontContext.Provider>
  );
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} {...props} style={withAppFont(style).style} />;
});

// Resolve NativeWind classNames into `style` before our components see it, so class weights (font-bold, ...) are
// mapped too. TextInput keeps NativeWind's placeholder colour class.
cssInterop(Text, { className: "style" });
cssInterop(TextInput, {
  className: { target: "style" },
  placeholderClassName: { target: false, nativeStyleToProp: { color: "placeholderTextColor" } },
});
