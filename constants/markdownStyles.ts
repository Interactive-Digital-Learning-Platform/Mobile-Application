import { Platform } from "react-native";
import { MarkdownIt } from "react-native-markdown-display";
import { colors } from "@/constants/colors";

// Single newline in LLM output should behave like a line break instead of
// being collapsed by strict CommonMark paragraph rules.
export const chatMarkdownItInstance = MarkdownIt({
  typographer: true,
  breaks: true,
});

const codeFontFamily = Platform.select({
  ios: "Courier New",
  android: "monospace",
  default: "monospace",
});

const borderColor = colors.borderColorLight;

export const chatMarkdownStyle = {
  body: {
    fontSize: 14,
    fontFamily: "Author-Regular",
    color: colors.primaryBlack,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },

  heading1: { fontFamily: "Author-Semibold", fontSize: 22, marginTop: 4, marginBottom: 8 },
  heading2: { fontFamily: "Author-Semibold", fontSize: 19, marginTop: 4, marginBottom: 8 },
  heading3: { fontFamily: "Author-Semibold", fontSize: 17, marginTop: 4, marginBottom: 6 },
  heading4: { fontFamily: "Author-Semibold", fontSize: 15, marginTop: 4, marginBottom: 6 },
  heading5: { fontFamily: "Author-Semibold", fontSize: 14, marginTop: 4, marginBottom: 4 },
  heading6: { fontFamily: "Author-Semibold", fontSize: 13, marginTop: 4, marginBottom: 4 },

  strong: { fontFamily: "Author-Semibold" },
  em: { fontFamily: "Author-Italic" },

  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  list_item: { marginBottom: 4 },
  bullet_list_icon: { marginLeft: 0, marginRight: 8, fontFamily: "Author-Regular" },
  bullet_list_content: { flex: 1 },
  ordered_list_icon: { marginLeft: 0, marginRight: 8, fontFamily: "Author-Regular" },
  ordered_list_content: { flex: 1 },

  code_inline: {
    fontFamily: codeFontFamily,
    fontSize: 13,
    backgroundColor: "#E4E4E4",
    borderWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  code_block: {
    fontFamily: codeFontFamily,
    fontSize: 13,
    color: "#F1F1F1",
    backgroundColor: colors.primaryBlack,
    borderWidth: 0,
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  fence: {
    fontFamily: codeFontFamily,
    fontSize: 13,
    color: "#F1F1F1",
    backgroundColor: colors.primaryBlack,
    borderWidth: 0,
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },

  blockquote: {
    backgroundColor: "#E8E8E8",
    borderLeftWidth: 3,
    borderColor: colors.primary,
    marginLeft: 0,
    marginVertical: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  hr: { backgroundColor: borderColor, height: 1, marginVertical: 8 },

  table: {
    borderWidth: 1,
    borderColor,
    borderRadius: 6,
    marginVertical: 6,
    overflow: "hidden",
  },
  thead: { backgroundColor: "#E4E4E4" },
  tbody: {},
  th: {
    flex: 1,
    padding: 6,
    fontFamily: "Author-Semibold",
    borderRightWidth: 1,
    borderColor,
  },
  tr: {
    borderBottomWidth: 1,
    borderColor,
    flexDirection: "row",
  },
  td: {
    flex: 1,
    padding: 6,
    fontFamily: "Author-Regular",
    borderRightWidth: 1,
    borderColor,
  },

  link: { color: colors.primary, textDecorationLine: "underline" },
} as const;
