import { scaleForAuthor } from "@/components/ui/AppText";
import { BaseToast, ErrorToast, InfoToast, type ToastConfig } from "react-native-toast-message";

// The library's built-in toasts, in the app font (Author) instead of the system font.
// The library defaults (12 / 10) are sized for the system font; Author draws smaller, so they're scaled up.
// fontWeight is cleared so the default bold doesn't fake-bold the font.
const text1Style = { fontFamily: "Author-Semibold", fontSize: scaleForAuthor(12), fontWeight: undefined };
const text2Style = { fontFamily: "Author-Regular", fontSize: scaleForAuthor(10) };

export const toastConfig: ToastConfig = {
  success: (props) => <BaseToast {...props} text1Style={text1Style} text2Style={text2Style} />,
  error: (props) => <ErrorToast {...props} text1Style={text1Style} text2Style={text2Style} />,
  info: (props) => <InfoToast {...props} text1Style={text1Style} text2Style={text2Style} />,
};
