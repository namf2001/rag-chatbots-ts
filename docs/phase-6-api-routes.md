# Phase 6: API Routes (Chat Streaming + Ingestion)

> **Mục tiêu**: Tạo production-ready API endpoints cho chat (streaming) và document management.
>
> 📌 Tương ứng bước **Application** + **Streamed Response** trong RAG diagram.

---

## 📋 Checklist

- [ ] Tạo `src/app/api/chat/route.ts` — Chat endpoint (streaming)
- [ ] Tạo/update `src/app/api/ingest/route.ts` — Full ingestion
- [ ] Tạo `src/app/api/documents/route.ts` — Document management
- [ ] Test streaming response
- [ ] Error handling

---

## Kiến thức cần biết

### Streaming hoạt động thế nào?

```
Client                    Server
  |--- POST /api/chat ---->|
  |                        | → Embed query
  |                        | → Search vectors
  |                        | → Build prompt
  |                        | → Send to LLM
  |<-- "RAG"               |
  |<-- " is"               | ← Tokens stream back
  |<-- " a"                |    one by one
  |<-- " technique..."     |
  |<-- [DONE]              |
```

- LLM generate từng token (word/subword)
- Server stream từng token về client ngay lập tức
- User thấy text xuất hiện dần dần → UX tốt hơn chờ full response

### Vercel AI SDK + useChat

Frontend dùng `useChat` hook sẽ tự handle streaming. Backend cần return đúng format.

---

## Step 1: Chat API (`src/app/api/chat/route.ts`)

### Bạn cần implement `POST` handler:

```
Input: { messages: [{ role: "user", content: "What is RAG?" }] }

Flow:
  1. Parse request body → lấy messages array
  2. Lấy message cuối cùng (user's latest question)
  3. Tạo RAG chain (Phase 5)
  4. Stream chain output về client
  5. Return StreamingTextResponse
```

### Cách stream LangChain output:

```typescript
// Cách 1: Dùng chain.stream()
const stream = await chain.stream({ input: userMessage });

// Convert LangChain stream → Web ReadableStream
const encoder = new TextEncoder();
const readableStream = new ReadableStream({
  async start(controller) {
    for await (const chunk of stream) {
      // chunk structure tùy vào loại chain
      // createRetrievalChain → chunk.answer
      // LCEL StringOutputParser → chunk là string trực tiếp
      const text = typeof chunk === "string" ? chunk : chunk.answer || "";
      if (text) {
        controller.enqueue(encoder.encode(text));
      }
    }
    controller.close();
  },
});

return new Response(readableStream, {
  headers: { "Content-Type": "text/plain; charset=utf-8" },
});
```

### Lưu ý quan trọng:

> ⚠️ `useChat` từ `@ai-sdk/react` yêu cầu response format đặc biệt.
> Bạn có 2 lựa chọn:
> 
> **A. Dùng Vercel AI SDK format** — import `StreamingTextResponse` từ `ai`
> **B. Dùng raw text stream** — custom `useChat` hoặc viết fetch client riêng
> 
> Recommend: Bắt đầu với **B** (raw stream), sau chuyển sang **A** khi tích hợp useChat.

---

## Step 2: Ingestion API (Update)

### Update `src/app/api/ingest/route.ts`

Nếu chưa complete ở Phase 4, đây là full flow:

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Parse form data
    // 2. Validate file (type, size)
    // 3. Save file to documents/
    // 4. Load document (loader.ts)
    // 5. Split into chunks (splitter.ts)
    // 6. Save document record to PostgreSQL
    // 7. Embed chunks + Store vectors (vectorstore.ts)
    // 8. Return success

    return NextResponse.json({
      success: true,
      documentId: record.id,
      filename: file.name,
      chunksCount: chunks.length,
    });
  } catch (error) {
    // Log error
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Validation rules:
- Max file size: 10MB
- Allowed types: `.pdf`, `.txt`, `.md`
- Filename sanitization

---

## Step 3: Documents API (`src/app/api/documents/route.ts`)

### GET — List documents

```typescript
import { db } from "@/lib/db";
import { documents, embeddings } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

export async function GET() {
  // Drizzle query: LEFT JOIN + GROUP BY + COUNT
  // 1. db.select({
  //      ...documents,
  //      chunksCount: count(embeddings.id),
  //    })
  //    .from(documents)
  //    .leftJoin(embeddings, eq(documents.id, embeddings.documentId))
  //    .groupBy(documents.id)
  //    .orderBy(desc(documents.createdAt))
  //
  // 2. Return NextResponse.json(results)
}
```

### DELETE — Remove document

```typescript
export async function DELETE(request: NextRequest) {
  // 1. Parse document ID from searchParams
  // 2. db.delete(documents).where(eq(documents.id, id))
  //    (CASCADE sẽ tự xóa embeddings liên quan — đã config trong schema)
  // 3. Xóa file từ documents/ directory (fs.unlink)
  // 4. Return NextResponse.json({ success: true })
}
```

---

## Step 4: Test

### Test chat streaming

```bash
# Test chat API
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is RAG?"}]}'

# Bạn sẽ thấy text stream ra từng phần
```

### Test full flow

```bash
# 1. Ingest document
curl -X POST http://localhost:3000/api/ingest -F "file=@documents/sample.txt"

# 2. List documents
curl http://localhost:3000/api/documents

# 3. Chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role":"user","content":"Tell me about RAG"}]}'

# 4. Delete document
curl -X DELETE "http://localhost:3000/api/documents?id=<uuid>"
```

---

## 📝 Error Handling

Các lỗi cần handle:
- Ollama not running → "Cannot connect to Ollama"
- No documents ingested → "No knowledge base found"
- File too large → "File exceeds 10MB limit"
- Invalid file type → "Unsupported file type"
- DB connection error → "Database unavailable"

---

## ✅ Kết quả mong đợi

- Chat API stream response real-time
- Ingestion pipeline hoàn chỉnh
- Document CRUD hoạt động
- Error cases handled gracefully

**→ [Phase 7: Frontend UI](./phase-7-frontend-ui.md)**
