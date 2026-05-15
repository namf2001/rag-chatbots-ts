"use client";

import { useChatStore } from "@/store/chat-store";
import { toast } from "sonner";

// useChatStream provides a sendMessage function that streams assistant responses
// from /api/chat using the Fetch Streams API and writes them into the Zustand store.
export function useChatStream() {
  const { messages, isLoading, addUserMessage, startAssistantMessage, appendToMessage, finalizeMessage, setLoading, clearMessages } =
    useChatStore();

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // 1. Add user message to store
    addUserMessage(content);
    setLoading(true);

    // 2. Prepare history for the API (include current message)
    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content },
    ];

    // 3. Create placeholder assistant message
    const assistantId = startAssistantMessage();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chat request failed");
      }

      if (!res.body) throw new Error("No response body");

      // 4. Read the stream and append chunks to assistant message
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        appendToMessage(assistantId, chunk);
      }
    } catch (err: any) {
      appendToMessage(assistantId, `\n\n_Error: ${err.message}_`);
      toast.error(err.message);
    } finally {
      finalizeMessage(assistantId);
      setLoading(false);
    }
  };

  return { messages, isLoading, sendMessage, clearMessages };
}
