"use client";

import { useEffect, useRef } from "react";
import { Bot, Sparkles, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { useChatStream } from "@/hooks/use-chat-stream";

// Suggestion prompts shown on the empty state.
const SUGGESTIONS = [
  "Tóm tắt nội dung các tài liệu đã upload",
  "Giải thích các khái niệm chính trong tài liệu",
  "So sánh thông tin giữa các tài liệu khác nhau",
  "Tìm các điểm quan trọng nhất trong tài liệu",
];

// ChatWindow is the main chat panel with message list, empty state, and prompt input.
export function ChatWindow() {
  const { messages, isLoading, sendMessage, clearMessages } = useChatStream();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-medium">RAG Assistant</span>
          {isLoading && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Thinking…
            </span>
          )}
        </div>
        {!isEmpty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
          >
            <Trash2 className="size-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Message list or empty state */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto w-full px-4">
          {isEmpty ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 py-12">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Bot className="size-7 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg tracking-tight">
                    What can I help you with?
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload documents in the sidebar, then ask me anything.
                  </p>
                </div>
              </div>

              {/* Suggestion chips */}
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
            /* ── Messages ── */
            <div className="py-6 flex flex-col gap-5">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 max-w-3xl mx-auto w-full">
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
