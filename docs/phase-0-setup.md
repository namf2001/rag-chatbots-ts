# Phase 0: Environment Setup

> **Mục tiêu**: Cài đặt tất cả tools và dependencies cần thiết để bắt đầu build RAG chatbot.

---

## 📋 Checklist

- [ ] Ollama installed & running
- [ ] LLM model pulled (llama3)
- [ ] Embedding model pulled (nomic-embed-text)
- [ ] Docker + PostgreSQL + pgvector running
- [ ] pnpm dependencies installed
- [ ] Drizzle ORM configured
- [ ] `.env.local` configured

---

## Step 1: Cài đặt & chạy Ollama

Ollama là runtime chạy LLM trên local machine.

```bash
# Cài Ollama
brew install ollama

# Chạy Ollama server (chạy ở 1 terminal riêng, hoặc dùng service)
ollama serve
```

### Pull models

Bạn cần 2 models:
- **LLM model**: Để generate câu trả lời
- **Embedding model**: Để chuyển text → vector

```bash
# LLM model - chọn 1 trong 2
ollama pull llama3          # ~4.7GB, chất lượng tốt
ollama pull mistral         # ~4.1GB, alternative

# Embedding model
ollama pull nomic-embed-text  # ~274MB, lightweight
```

### Verify

```bash
# Kiểm tra models đã pull
ollama list

# Test LLM
ollama run llama3 "Hello, who are you?"

# Test nhanh embedding (optional)
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "Hello World"
}'
```

> 💡 **Tip**: Ollama chạy ở `http://localhost:11434`. Hãy đảm bảo port này không bị chặn.

---

## Step 2: PostgreSQL + pgvector (Docker)

Project đã có file `docker-compose.yml` sẵn. Chỉ cần chạy:

```bash
# Khởi động PostgreSQL (background)
docker compose up -d

# Kiểm tra container chạy chưa
docker compose ps

# Xem logs
docker compose logs postgres

# Verify pgvector extension
docker exec -it rag-postgres psql -U raguser -d ragchatbot -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT extversion FROM pg_extension WHERE extname = 'vector';"
```

### Các lệnh Docker hữu ích:

```bash
# Dừng container
docker compose down

# Dừng + xóa data (reset database)
docker compose down -v

# Kết nối psql
docker exec -it rag-postgres psql -U raguser -d ragchatbot
```

> ⚠️ Image `pgvector/pgvector:pg16` đã có pgvector extension pre-installed. Bạn chỉ cần `CREATE EXTENSION IF NOT EXISTS vector;` trong database.

---

## Step 3: Cài pnpm dependencies

### Core LangChain packages

```bash
# LangChain core
pnpm add langchain @langchain/core @langchain/ollama @langchain/community

# Vercel AI SDK - cho streaming chat UI
pnpm add ai @ai-sdk/react
```

### Database — Drizzle ORM

```bash
# Drizzle ORM + PostgreSQL driver
pnpm add drizzle-orm pg dotenv

# Drizzle Kit (dev tools: migrations, studio)
pnpm add -D drizzle-kit @types/pg tsx
```

### Document processing

```bash
# PDF parsing
pnpm add pdf-parse
pnpm add -D @types/pdf-parse

# Markdown rendering cho chat
pnpm add react-markdown remark-gfm
```

### shadcn/ui components (bạn sẽ cần)

```bash
pnpm dlx shadcn@latest add card input scroll-area avatar badge separator textarea tooltip dropdown-menu dialog skeleton
```

---

## Step 4: Tạo file `.env.local`

Tạo file `.env.local` ở root project:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_LLM_MODEL=llama3
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# PostgreSQL Configuration (match docker-compose.yml)
DATABASE_URL=postgresql://raguser:ragpass@localhost:5432/ragchatbot

# RAG Configuration
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
RETRIEVAL_TOP_K=4

# Embedding dimension (nomic-embed-text = 768)
EMBEDDING_DIMENSION=768

# NextAuth (sẽ config ở phase sau)
# NEXTAUTH_SECRET=
# NEXTAUTH_URL=http://localhost:3000
```

> ⚠️ Đừng quên `.env.local` đã nằm trong `.gitignore` (Next.js thêm sẵn).

---

## Step 5: Cấu hình Drizzle ORM

### 5.1. Tạo `drizzle.config.ts` (root project)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/migrations",
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### 5.2. Tạo `src/lib/db/index.ts` — Database connection

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Singleton pool cho Next.js (tránh leak connections khi hot-reload)
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const pool = globalForDb.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
```

### 5.3. Tạo `src/lib/db/schema.ts` — Database schema

Đây là nơi định nghĩa toàn bộ tables. Drizzle sẽ dùng file này để generate migrations.

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  vector,
  index,
} from "drizzle-orm/pg-core";

// === Documents table ===
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: integer("file_size"),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Embeddings table (vector chunks) ===
export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}),
  embedding: vector("embedding", { dimensions: 768 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // HNSW index cho cosine similarity search
  index("embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);

// === Chat Sessions ===
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  // userId sẽ thêm khi tích hợp NextAuth (Phase 8)
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === Chat Messages ===
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => chatSessions.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  sources: jsonb("sources").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});
```

> 💡 **Lưu ý**: `vector("embedding", { dimensions: 768 })` — Drizzle native support pgvector! Không cần custom type.

### 5.4. Thêm scripts vào `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:drop": "drizzle-kit drop"
  }
}
```

### 5.5. Generate & Apply migrations

```bash
# 1. Đảm bảo PostgreSQL đang chạy
docker compose up -d

# 2. Enable pgvector extension trước (Drizzle không tự enable)
docker exec -it rag-postgres psql -U raguser -d ragchatbot -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 3. Generate migration files từ schema
pnpm db:generate

# 4. Apply migrations vào database
pnpm db:migrate

# 5. (Optional) Mở Drizzle Studio xem data
pnpm db:studio
```

> ⚠️ **Quan trọng**: Phải `CREATE EXTENSION vector` trước khi chạy migrations, vì migration sẽ tạo column kiểu `vector(768)`.

---

## Step 6: Tạo folder structure

```bash
mkdir -p src/lib/langchain
mkdir -p src/components/chat
mkdir -p src/components/documents
mkdir -p src/app/api/chat
mkdir -p src/app/api/ingest
mkdir -p src/app/api/documents
mkdir -p documents
```

---

## Step 7: Verify setup

### Test Ollama

```bash
curl http://localhost:11434/api/tags
```

### Test PostgreSQL + Drizzle

```bash
# Drizzle Studio (mở browser)
pnpm db:studio

# Hoặc verify bằng psql
docker exec -it rag-postgres psql -U raguser -d ragchatbot -c "\dt"
# Phải thấy: documents, embeddings, chat_sessions, chat_messages
```

### Test Next.js

```bash
pnpm dev
# Mở http://localhost:3000
```

---

## ✅ Kết quả mong đợi

Sau khi hoàn thành Phase 0:
- Ollama chạy ở `localhost:11434` với 2 models
- PostgreSQL chạy via Docker ở `localhost:5432` với pgvector extension
- Drizzle ORM configured + schema + migrations applied
- 4 tables: `documents`, `embeddings`, `chat_sessions`, `chat_messages`
- Drizzle Studio hoạt động
- Next.js dev server chạy được

**→ Chuyển sang [Phase 1: Document Loading](./phase-1-document-loading.md)**
