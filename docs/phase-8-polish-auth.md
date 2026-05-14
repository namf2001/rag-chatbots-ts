# Phase 8: Polish, Auth & Advanced Features

> **Mục tiêu**: Tối ưu UX, tích hợp NextAuth v4, và thêm tính năng nâng cao.

---

## 📋 Checklist

- [ ] NextAuth v4 setup
- [ ] Chat history (per user)
- [ ] Conversation memory (follow-up questions)
- [ ] Error handling & loading states
- [ ] Model selection
- [ ] Performance optimization

---

## Part A: NextAuth v4 Integration

### Step 1: Install

```bash
npm install next-auth@4
```

### Step 2: Setup

Tạo `src/app/api/auth/[...nextauth]/route.ts`:

```
1. Import NextAuth, providers (Credentials, Google, GitHub, ...)
2. Config:
   - providers: [chọn provider bạn muốn]
   - session: { strategy: "jwt" }
   - callbacks: { session, jwt }
3. Export { GET, POST } = handler
```

### Step 3: Database Schema update

```sql
-- Thêm users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update chat_sessions: thêm user_id
ALTER TABLE chat_sessions 
ADD COLUMN user_id UUID REFERENCES users(id);

-- Update documents: thêm user_id (optional)
ALTER TABLE documents
ADD COLUMN user_id UUID REFERENCES users(id);
```

### Step 4: Protect routes

```typescript
// Middleware: src/middleware.ts
// Protect /api/chat, /api/ingest, /api/documents
// Allow /api/auth/*
// Redirect unauthenticated → /login
```

---

## Part B: Chat History

### Step 1: Save messages to DB

Update `POST /api/chat`:
```
1. Trước khi gọi RAG chain → create/get chat_session
2. Save user message → chat_messages
3. Sau khi stream xong → save assistant message
4. Include sources trong message record
```

### Step 2: List conversations API

```
GET /api/conversations → list chat_sessions cho current user
GET /api/conversations/[id] → get messages for session
DELETE /api/conversations/[id] → delete session + messages
```

### Step 3: UI updates

- Sidebar: hiển thị conversation list
- Click conversation → load messages
- "New Chat" button → tạo session mới

---

## Part C: Conversation Memory

### Vấn đề:

```
User: "What is RAG?"
Bot: "RAG is Retrieval-Augmented Generation..."

User: "How does it work?" ← 'it' = RAG, nhưng RAG chain không biết
Bot: "I'm not sure what you're referring to" ← ❌
```

### Giải pháp: Truyền chat history vào prompt

```typescript
// Update prompt template:
const SYSTEM_TEMPLATE = `
You are a helpful AI assistant.

Context from knowledge base:
{context}

Previous conversation:
{chat_history}

Answer the user's latest question based on the context and conversation history.
`;

// Format chat_history:
// "User: What is RAG?\nAssistant: RAG is...\n"
```

### Hoặc dùng LangChain Memory:

```typescript
import { BufferMemory } from "langchain/memory";
// Research: ConversationalRetrievalQAChain
```

---

## Part D: Error Handling & UX

### Error states cần handle trong UI:

| Error | UI Treatment |
|:---|:---|
| Ollama not running | Banner: "⚠️ AI server offline. Start Ollama." |
| No documents ingested | Empty state: "Upload documents to get started" |
| Network error | Toast notification + retry button |
| Stream interrupted | Show partial response + "Response interrupted" |

### Loading states:

- Chat: Skeleton + typing indicator (3 dots animation)
- Ingestion: Progress bar + chunk count
- Document list: Skeleton cards

---

## Part E: Model Selection (Optional)

### Cho phép user chọn Ollama model:

```
GET /api/models → call Ollama API: GET http://localhost:11434/api/tags
→ Return list of available models

UI: Dropdown trong header/settings để chọn model
→ Pass model name trong chat request
```

---

## Part F: Performance Tips

1. **Connection pooling**: Reuse pg Pool (đã làm ở Phase 1)
2. **Embedding cache**: Cache embeddings cho repeated queries
3. **Debounce**: Debounce input nếu có auto-suggest
4. **Lazy loading**: Load components động (Next.js dynamic imports)
5. **Optimize chunks**: Experiment với chunk_size để balance quality/speed

---

## ✅ Final Checklist

- [ ] Auth hoạt động (login/logout/protected routes)
- [ ] Chat history lưu per user
- [ ] Follow-up questions hoạt động (conversation memory)
- [ ] Error states hiển thị đẹp
- [ ] Loading states smooth
- [ ] Responsive trên mobile

---

## 🎉 Congratulations!

Khi hoàn thành Phase 8, bạn có một RAG Chatbot hoàn chỉnh với:
- ✅ Full RAG pipeline (Load → Chunk → Embed → Store → Retrieve → Generate)
- ✅ Streaming chat UI
- ✅ PostgreSQL + pgvector
- ✅ Ollama local (free, private)
- ✅ NextAuth authentication
- ✅ Chat history & memory
- ✅ Document management
