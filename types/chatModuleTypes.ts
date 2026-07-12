import { ViewStyle, TextStyle, ImageSourcePropType } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { RefObject } from "react";
import { FlashListRef } from "@shopify/flash-list";
import { ChatInputValues } from "@/schemas/chatSchemas";


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

export type QuickActionType = {
  icon: LucideIcon,
  title : string,
  prompt : string,
  get?: () => string
}

export type CitationType = {
  title: string,
  from : string,
  content: string
}

export type MessageType = {
  id: string,
  localID: string,
  serverID?: string,
  createdAt : Date,
  role: string,
  content: string,
  isLoading? : boolean,
  isError? : boolean,
  type: string,
  citations? : CitationType[],
  tokens?: number
}

export type StreamCallbacks = {
  onToken: (token: string) => void;
  onDone: (messageID: string) => void;
  onError: (error: string) => void;
}

export type UseChatReturn = {
  messages: MessageType[];
  conversationID: string | null;
  isStreaming: boolean;
  isSending: boolean;
  hasMoreHistory: boolean;
  isLoadingHistory: boolean;
  chatRef: RefObject<FlashListRef<MessageType> | null>;
  sendMessage: (values: ChatInputValues) => Promise<void>;
  loadMoreHistory: () => void;
}