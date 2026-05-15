"use client";

import { useRef, useEffect, useCallback } from "react";
import { ArrowUp, Square, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

// ChatInput renders a prompt-kit style input box:
// - Full rounded container card at the bottom
// - Textarea grows with content up to 5 lines
// - Send (arrow-up circle) and Stop button in bottom-right corner
// - Enter submits, Shift+Enter inserts newline
export function ChatInput({ onSend, onStop, isLoading, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const value = textareaRef.current?.value.trim();
    if (!value || isLoading) return;
    onSend(value);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
  }, [isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        className={cn(
          "relative rounded-2xl border bg-background shadow-sm transition-shadow",
          "focus-within:shadow-md focus-within:border-ring/50",
          disabled && "opacity-50"
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          placeholder="Ask anything about your documents…"
          rows={1}
          disabled={disabled || isLoading}
          onKeyDown={handleKeyDown}
          onChange={handleInput}
          className={cn(
            "w-full resize-none bg-transparent px-4 pt-3.5 pb-12",
            "text-sm placeholder:text-muted-foreground/60",
            "focus:outline-none min-h-[52px] max-h-[180px] overflow-y-auto",
            "leading-relaxed"
          )}
        />

        {/* Bottom toolbar */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
          {/* Left: attachment hint */}
          <p className="text-[11px] text-muted-foreground/50 hidden sm:block">
            Enter ↵ to send · Shift+Enter for new line
          </p>
          <div className="flex-1 sm:flex-none" />

          {/* Right: action button */}
          {isLoading ? (
            <Button
              size="icon"
              variant="secondary"
              className="size-8 rounded-xl"
              onClick={onStop}
            >
              <Square className="size-3 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={disabled}
              className="size-8 rounded-xl"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
