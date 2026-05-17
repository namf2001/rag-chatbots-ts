import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
}

interface ChatState {
  currentSessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  
  // Session actions
  setSessionId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  
  // Message actions
  addUserMessage: (content: string) => string;
  startAssistantMessage: (id?: string) => string;
  appendToMessage: (id: string, chunk: string) => void;
  finalizeMessage: (id: string) => void;
  
  // UI actions
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

// useChatStore manages the chat messages and streaming state using Zustand.
export const useChatStore = create<ChatState>((set) => ({
  currentSessionId: null,
  messages: [],
  isLoading: false,

  setSessionId: (id) => set({ currentSessionId: id }),
  setMessages: (messages) => set({ messages }),

  addUserMessage: (content: string) => {
    const id = crypto.randomUUID();
    set((state) => ({
      messages: [...state.messages, { id, role: "user", content }],
    }));
    return id;
  },

  startAssistantMessage: (existingId?: string) => {
    const id = existingId || crypto.randomUUID();
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

  clearMessages: () => set({ messages: [], currentSessionId: null }),
}));
