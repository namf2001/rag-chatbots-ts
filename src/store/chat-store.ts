import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  addUserMessage: (content: string) => string;
  startAssistantMessage: () => string;
  appendToMessage: (id: string, chunk: string) => void;
  finalizeMessage: (id: string) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

// useChatStore manages the chat messages and streaming state using Zustand.
export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,

  addUserMessage: (content: string) => {
    const id = crypto.randomUUID();
    set((state) => ({
      messages: [...state.messages, { id, role: "user", content }],
    }));
    return id;
  },

  startAssistantMessage: () => {
    const id = crypto.randomUUID();
    set((state) => ({
      messages: [
        ...state.messages,
        { id, role: "assistant", content: "", isStreaming: true },
      ],
    }));
    return id;
  },

  appendToMessage: (id: string, chunk: string) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      ),
    }));
  },

  finalizeMessage: (id: string) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m
      ),
    }));
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  clearMessages: () => set({ messages: [] }),
}));
