# Phase 7: Frontend UI (Chat Interface)

> **Mục tiêu**: Xây dựng giao diện chat đẹp, dark theme, streaming, sử dụng shadcn/ui.
>
> 📌 Tương ứng bước **Application** + **User** trong RAG diagram.

---

## 📋 Checklist

- [ ] Tạo `src/components/chat/ChatWindow.tsx`
- [ ] Tạo `src/components/chat/MessageBubble.tsx`
- [ ] Tạo `src/components/chat/ChatInput.tsx`
- [ ] Tạo `src/components/chat/SourceCard.tsx`
- [ ] Tạo `src/components/documents/FileUploader.tsx`
- [ ] Tạo `src/components/documents/DocumentList.tsx`
- [ ] Tạo layout với Sidebar
- [ ] Update `src/app/page.tsx`
- [ ] Dark theme + animations

---

## Kiến thức cần biết

### useChat hook (Vercel AI SDK)

```tsx
"use client";
import { useChat } from "@ai-sdk/react";

const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: "/api/chat",  // endpoint từ Phase 6
});

// messages: Array<{ id, role, content }> — auto-managed
// input: string — current input value
// handleInputChange: input onChange handler
// handleSubmit: form submit handler
// isLoading: boolean — đang chờ response?
```

### shadcn/ui components bạn sẽ dùng

Đã cài ở Phase 0. Các component chính:
- `Card` — container cho messages, source cards
- `Input` / `Textarea` — chat input
- `ScrollArea` — scrollable message list
- `Avatar` — user/bot avatars
- `Badge` — labels, tags
- `Skeleton` — loading states
- `Button` — send button, upload button
- `Dialog` — upload dialog
- `Tooltip` — hover info

---

## Step 1: Layout & Sidebar

### File: `src/app/page.tsx`

Layout gồm 2 phần chính:

```
┌─────────────┬──────────────────────────┐
│             │                          │
│  Sidebar    │     Chat Window          │
│  (280px)    │                          │
│             │  ┌─────────────────────┐ │
│  - Logo     │  │  Message List       │ │
│  - New Chat │  │  (scroll)           │ │
│  - Docs     │  │                     │ │
│             │  │  [User] ...         │ │
│  Documents: │  │  [Bot]  ...         │ │
│  📄 doc1    │  │  [User] ...         │ │
│  📄 doc2    │  │  [Bot]  ...         │ │
│             │  │                     │ │
│  [Upload]   │  ├─────────────────────┤ │
│             │  │  Chat Input         │ │
│             │  │  [___________][Send]│ │
│             │  └─────────────────────┘ │
└─────────────┴──────────────────────────┘
```

### Gợi ý:
- Dùng CSS Grid hoặc Flexbox cho layout
- Sidebar: fixed width `w-[280px]`
- Chat area: `flex-1`
- Dark theme: thêm class `dark` vào `<html>` tag

---

## Step 2: ChatWindow Component

### File: `src/components/chat/ChatWindow.tsx`

```
"use client" component

Structure:
  1. Dùng useChat hook
  2. Render:
     - Header (model name, status)
     - ScrollArea chứa messages list
     - ChatInput ở dưới cùng
  3. Auto-scroll to bottom khi có message mới

Props: (không cần, state nằm trong useChat)
```

### Hướng dẫn:

```tsx
// 1. Import useChat, shadcn components
// 2. Gọi useChat({ api: "/api/chat" })
// 3. Map messages → <MessageBubble />
// 4. Render <ChatInput /> ở bottom
// 5. Dùng useRef + useEffect để auto-scroll
```

---

## Step 3: MessageBubble Component

### File: `src/components/chat/MessageBubble.tsx`

```
Props:
  - role: "user" | "assistant"
  - content: string
  - sources?: Array<{ content, metadata }> // optional

Render:
  - User message: align right, primary color bg
  - Bot message: align left, muted bg
  - Avatar (lucide-react icons: User, Bot)
  - Content: dùng react-markdown để render markdown
  - Sources: render SourceCard[] nếu có
```

### Styling gợi ý:
```css
/* User message */
.user-msg { @apply ml-auto bg-primary text-primary-foreground rounded-2xl rounded-br-sm }

/* Bot message */  
.bot-msg { @apply mr-auto bg-muted rounded-2xl rounded-bl-sm }
```

### Markdown rendering:

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {content}
</ReactMarkdown>
```

---

## Step 4: ChatInput Component

### File: `src/components/chat/ChatInput.tsx`

```
Props:
  - input: string
  - handleInputChange: function
  - handleSubmit: function
  - isLoading: boolean

Render:
  - Textarea (auto-resize, max 5 rows)
  - Send button (disabled khi loading hoặc empty)
  - Loading indicator khi isLoading

Behavior:
  - Enter → submit (Shift+Enter → new line)
  - Auto-focus on mount
  - Clear input after submit (useChat does this)
```

### Icons: `Send`, `Loader2` từ `lucide-react`

---

## Step 5: FileUploader Component

### File: `src/components/documents/FileUploader.tsx`

```
Features:
  - Drag & drop area
  - Click to browse files
  - File type validation (.pdf, .txt, .md)
  - Upload progress indicator
  - Success/error feedback

Behavior:
  1. User drops/selects file
  2. POST to /api/ingest with FormData
  3. Show progress
  4. On success: refresh document list
  5. On error: show error message
```

### shadcn components: `Dialog`, `Button`, `Badge`

---

## Step 6: DocumentList Component

### File: `src/components/documents/DocumentList.tsx`

```
Props:
  - Fetch from /api/documents

Render:
  - List of documents: filename, type badge, chunks count, date
  - Delete button per document
  - Empty state khi chưa có documents

Behavior:
  - Load on mount (useEffect + fetch)
  - Delete → confirm → call DELETE /api/documents
  - Refresh after delete
```

---

## Step 7: Dark Theme

### Update `src/app/layout.tsx`:

```tsx
// Thêm class "dark" vào html tag
<html lang="en" className="dark">
```

shadcn/ui đã có sẵn dark theme variables trong `globals.css` (từ preset bạn đã chọn). Chỉ cần enable.

### (Optional) Theme toggle:

```bash
npx shadcn@latest add switch
```

Tạo toggle component để switch light/dark.

---

## Step 8: Micro-animations

Gợi ý animations cho UX tốt:

```css
/* Message appear animation */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.message-enter { animation: slideUp 0.3s ease-out; }

/* Typing indicator (3 dots) */
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Streaming text cursor */
.streaming::after {
  content: "▊";
  animation: blink 1s infinite;
}
```

---

## ✅ Kết quả mong đợi

- Dark theme chat UI hoàn chỉnh
- Streaming text hiển thị real-time
- Upload documents qua drag & drop
- Source cards hiển thị chunks được trích dẫn
- Responsive layout (desktop + mobile)
- Smooth animations

**→ [Phase 8: Polish & Auth](./phase-8-polish-auth.md)**
