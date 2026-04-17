import { ViewStyle, TextStyle, ImageSourcePropType } from "react-native";
import { LucideIcon } from "lucide-react-native";

export type customButtonType = {
  title: string;
  handlePress: () => void;
  buttonStyles?: ViewStyle;
  isLoading?: boolean;
  textStyles?: TextStyle;
  image?: ImageSourcePropType;
  backgroundColor?: string;
  borderColor?: string;
};

export type HeaderProps = {
  IconComponent?: LucideIcon;
  title?: string;
  onIconPress?: () => void;
};

export type signUpFormValues = {
  username: string,
  email: string,
  password: string
}

export type signInFormValues = {
  email: string,
  password: string
}

export type TabIconType = {
  icon : ImageSourcePropType,
  name : string,
  color : string,
  focused: boolean
}