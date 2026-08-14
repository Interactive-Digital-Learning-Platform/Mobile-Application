import { useState } from "react";
import { askLabTutor } from "@/services/aiTutorService";
import { MessageType } from "@/types/labModuleTypes";

let messageIdCounter = 0;
const nextMessageId = () => `lab-tutor-${Date.now()}-${messageIdCounter++}`;

export const useLabTutor = (labRunId: string | undefined) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isSending, setIsSending] = useState(false);

  const sendQuestion = async (question: string) => {
    if (!labRunId || !question.trim()) return;

    const userMessageId = nextMessageId();
    const userMessage: MessageType = {
      id: userMessageId,
      localID: userMessageId,
      content: question,
      type: "text",
      role: "user",
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const { answer } = await askLabTutor(labRunId, question);
      const tutorMessageId = nextMessageId();
      const tutorMessage: MessageType = {
        id: tutorMessageId,
        localID: tutorMessageId,
        content: answer,
        type: "text",
        role: "assistant",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, tutorMessage]);
    } catch (error) {
      const errorMessageId = nextMessageId();
      const errorMessage: MessageType = {
        id: errorMessageId,
        localID: errorMessageId,
        content: "Sorry, I couldn't reach the tutor right now. Try again in a moment.",
        type: "text",
        role: "assistant",
        createdAt: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return { messages, isSending, sendQuestion };
};
