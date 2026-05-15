"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/store/chat-store";

interface MessageBubbleProps {
  message: Message;
}

// TypingLoader renders a three-dot animated loader (prompt-kit "dots" style).
function TypingLoader() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
        />
      ))}
    </div>
  );
}

// MessageBubble renders a single message following the prompt-kit design pattern:
// - User messages: right-aligned pill bubble
// - AI messages: left-aligned flat text with avatar (no bubble)
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end message-enter">
        <div className="max-w-[80%] bg-secondary text-secondary-foreground rounded-3xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // AI message: flat with avatar
  return (
    <div className="flex gap-3 message-enter">
      <Avatar className="size-7 shrink-0 mt-0.5 border border-border">
        <AvatarFallback className="bg-primary/10 text-primary">
          <Bot className="size-3.5" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 pt-0.5">
        {message.isStreaming && !message.content ? (
          <TypingLoader />
        ) : (
          <div
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none text-foreground",
              message.isStreaming && "streaming"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-foreground/70 animate-pulse ml-0.5 translate-y-0.5" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
