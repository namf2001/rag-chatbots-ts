"use client";

import { useChatStore } from "@/store/chat-store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export function useChatStream() {
  const { 
    messages, 
    isLoading, 
    currentSessionId,
    setSessionId,
    setMessages,
    addUserMessage, 
    startAssistantMessage, 
    appendToMessage, 
    finalizeMessage, 
    setLoading, 
    clearMessages 
  } = useChatStore();
  
  const router = useRouter();
  const queryClient = useQueryClient();

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    let sessionId = currentSessionId;

    // 1. If no session, create one first (like ChatGPT/Gemini)
    if (!sessionId) {
      try {
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            title: content.slice(0, 40) + (content.length > 40 ? "..." : "") 
          }),
        });
        
        if (!res.ok) throw new Error("Failed to create chat session");
        
        const data = await res.json();
        sessionId = data.id;
        
        // Update global state
        setSessionId(sessionId);
        
        // Invalidate history query to show the new chat in sidebar immediately
        queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
        
        // Update URL to reflect the new session (like ChatGPT/Gemini)
        router.push(`/?id=${sessionId}`, { scroll: false });
      } catch (err: any) {
        toast.error(err.message);
        return;
      }
    }

    // 2. Add user message to store
    addUserMessage(content);
    setLoading(true);

    // 3. Create placeholder assistant message
    const assistantId = startAssistantMessage();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content }
          ],
          sessionId 
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chat request failed");
      }

      if (!res.body) throw new Error("No response body");

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

  return { messages, isLoading, sendMessage, clearMessages, currentSessionId, setSessionId, setMessages };
}
