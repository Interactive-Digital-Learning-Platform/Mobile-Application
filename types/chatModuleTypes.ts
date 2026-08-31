import { ViewStyle, TextStyle, ImageSourcePropType } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { RefObject } from "react";
import { FlashListRef } from "@shopify/flash-list";
import { ChatInputValues, SourceCitationType } from "@/schemas/chatSchemas";


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

export type OtpCodeFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

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

export type ChatLanguage = "English" | "Sinhala";

export type AttachmentKind = "image" | "pdf";


export type ChatAttachmentStatus = "uploading" | "processing" | "ready" | "failed";


export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};


export type ChatAttachment = {
  localID: string;
  serverID?: string;
  kind: AttachmentKind;
  filename: string;
  mimeType: string;
  size?: number;
  localUri?: string;
  previewUrl?: string;
  status: ChatAttachmentStatus;
  uploadProgress?: number;
  error?: string;
};

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
  sources? : SourceCitationType[],
  tokens?: number,
  attachments?: ChatAttachment[],
  translationFailed?: boolean,
  isTranslated?: boolean,
  translatedContent?: string
}

export type StreamCallbacks = {
  onConversationCreated?: (conversationID: string) => void,
  onToken: (token: string) => void;
  onDone: (
    messageID: string,
    meta?: { translationFailed?: boolean; sources?: SourceCitationType[] },
  ) => void;
  onError: (error: string) => void;
}

export type ChatConversation = {
  conversation_id: string;
  user_id: string;
  title: string | null;
  filename?: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
};

export type UserChatsRequest = {
  userID: string;
  limit?: number;
  offset?: number;
};

export type ChatHistorySectionName = "Today" | "Last Week" | "Older";

export type ChatHistoryListItem =
  | {
      type: "section";
      id: string;
      title: ChatHistorySectionName;
    }
  | {
      type: "conversation";
      id: string;
      conversation: ChatConversation;
    };

export type ChatHistoryItemProps = {
  conversation: ChatConversation;
  isSelected?: boolean;
  onPress?: (conversation: ChatConversation) => void;
};

export type AIChatSidebarProps = {
  selectedConversationID?: string;
  onConversationPress?: (conversation: ChatConversation) => void;
  onNewChatPress?: () => void;
};

export type UseChatReturn = {
  messages: MessageType[];
  conversationID: string | null;
  isStreaming: boolean;
  isSending: boolean;
  hasMoreHistory: boolean;
  isLoadingHistory: boolean;
  chatRef: RefObject<FlashListRef<MessageType> | null>;
  language: ChatLanguage;
  setLanguage: (language: ChatLanguage) => void;
  sendMessage: (values: ChatInputValues, attachment?: ChatAttachment) => Promise<void>;
  loadMoreHistory: () => void;
  startNewConversation: () => void;
  openConversation: (conversationID: string) => void;
  ensureConversation: () => Promise<string>;
  stopStreaming: () => void;
}

export type StreamMessagePropType = {
  conversationID?: string;
  userID: string;
  message: string;
  language: ChatLanguage;
  attachmentIds?: string[];
  callbacks: StreamCallbacks;
  signal?: AbortSignal;
}