# Phase 7: Frontend UI (Chat Interface)

> **Mục tiêu**: Xây dựng giao diện chat dark theme với shadcn Sidebar, streaming messages, và document management.
>
> 📌 Stack: **Zustand** (chat state) + **TanStack Query** (documents) + **shadcn Sidebar**

---

## ✅ Danh sách files đã tạo

| File | Mục đích |
|:--|:--|
| `src/store/chat-store.ts` | Zustand store — quản lý messages & streaming state |
| `src/hooks/use-chat-stream.ts` | Custom hook — fetch stream từ `/api/chat` |
| `src/hooks/use-documents.ts` | TanStack Query hooks — fetch, upload, delete docs |
| `src/components/chat/message-bubble.tsx` | Render 1 message (user/assistant + markdown) |
| `src/components/chat/chat-input.tsx` | Textarea + Send button |
| `src/components/chat/chat-window.tsx` | Tổng hợp messages + skeleton + input |
| `src/components/chat/chat-layout.tsx` | shadcn Sidebar + ChatWindow |
| `src/components/documents/file-uploader.tsx` | Drag & drop upload |
| `src/components/documents/document-list.tsx` | Danh sách docs + delete |
| `src/app/page.tsx` | Entry point → `<ChatLayout />` |

---

## Kiến trúc tổng quan

```
layout.tsx (dark, QueryProvider, TooltipProvider)
└── page.tsx
    └── ChatLayout (SidebarProvider)
        ├── AppSidebar
        │   ├── FileUploader  ← useUploadDocument() [TanStack Mutation]
        │   └── DocumentList  ← useDocuments() [TanStack Query]
        └── main
            └── ChatWindow
                ├── MessageBubble[]  ← useChatStore (Zustand)
                └── ChatInput        ← useChatStream() [Fetch Streams API]
```

---

## File 1: `src/store/chat-store.ts`

```typescript
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
```

---

## File 2: `src/hooks/use-chat-stream.ts`

```typescript
"use client";

import { useChatStore } from "@/store/chat-store";
import { toast } from "sonner";

// useChatStream provides a sendMessage function that streams assistant responses.
export function useChatStream() {
  const { messages, isLoading, addUserMessage, startAssistantMessage, appendToMessage, finalizeMessage, setLoading, clearMessages } =
    useChatStore();

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    addUserMessage(content);
    setLoading(true);

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content },
    ];

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
```

---

## File 3: `src/hooks/use-documents.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Document {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  chunksCount: number;
}

export const documentsQueryKey = ["documents"] as const;

// useDocuments fetches the list of ingested documents.
export function useDocuments() {
  return useQuery<Document[]>({
    queryKey: documentsQueryKey,
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      return data.documents;
    },
    staleTime: 30 * 1000,
  });
}

// useDeleteDocument deletes a document by ID with cache invalidation.
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsQueryKey });
      toast.success("Document deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// useUploadDocument uploads a file to the ingest API.
export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/ingest", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: documentsQueryKey });
      toast.success(`Ingested "${data.filename}" → ${data.chunksCreated} chunks`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
```

---

## Test sau khi hoàn thành

1. Mở `http://localhost:3000`
2. Upload `documents/sample.txt` qua sidebar
3. Hỏi chatbot: *"mật khẩu wifi của tàu là gì?"*
4. Xem text stream ra từng từ một

---

## ✅ Kết quả mong đợi

- Dark theme toàn bộ app
- Sidebar trái: upload + danh sách documents
- Chat phải: streaming messages với markdown
- Typing skeleton khi chờ LLM
- Slide-up animation mỗi tin nhắn mới

**→ [Phase 8: Polish & Auth](./phase-8-polish-auth.md)**
