"use client";

import { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Tóm tắt nội dung các tài liệu đã upload",
  "Giải thích các khái niệm chính trong tài liệu",
  "So sánh thông tin giữa các tài liệu khác nhau",
  "Tìm các điểm quan trọng nhất trong tài liệu",
];

export function ChatWindow() {
  const {
    messages,
    isLoading,
    sendMessage,
    setSessionId,
    setMessages,
    currentSessionId
  } = useChatStream();

  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get("id");

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (sessionIdFromUrl && sessionIdFromUrl !== currentSessionId) {
      const loadSession = async () => {
        try {
          const res = await fetch(`/api/chats/${sessionIdFromUrl}`);
          if (!res.ok) throw new Error("Chat not found");
          const data = await res.json();

          setSessionId(sessionIdFromUrl);
          setMessages(data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content
          })));
        } catch (err: any) {
          toast.error(err.message);
        }
      };
      loadSession();
    }
  }, [sessionIdFromUrl, currentSessionId, setSessionId, setMessages]);

  useEffect(() => {
    if (shouldAutoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll, isLoading]); // Added isLoading to dependencies

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 150;
    setShouldAutoScroll(isAtBottom);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      {/* Scrollable Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
      >
        <div className="max-w-3xl mx-auto w-full px-4 py-8">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 py-12">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Bot className="size-7 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg tracking-tight text-foreground">
                    What can I help you with?
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload documents in the sidebar, then ask me anything.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left text-sm px-4 py-3 rounded-xl border bg-muted/40 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {/* Thinking Indicator inside the chat flow */}
              {isLoading && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ml-10">
                  <div className="relative flex size-2 items-center justify-center">
                    <div className="absolute size-full rounded-full bg-emerald-500 animate-pulse opacity-75" />
                  </div>
                  <span className="font-medium tracking-tight text-gray-400">Thinking…</span>
                </div>
              )}

              <div ref={bottomRef} className="h-10 shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="shrink-0 border-t bg-background p-4 pb-6">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
