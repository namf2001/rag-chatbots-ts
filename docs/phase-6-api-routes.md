# Phase 6: API Routes (Chat Streaming + Ingestion)

> **Mục tiêu**: Tạo production-ready API endpoints cho chat (streaming) và document management.

---

## Tổng quan các file cần tạo/cập nhật

| File | Trạng thái | Việc cần làm |
|:--|:--|:--|
| `src/app/api/chat/route.ts` | ✅ Tạo mới | Chat streaming |
| `src/app/api/ingest/route.ts` | ✅ Đã có | Đối chiếu, không cần sửa |
| `src/app/api/documents/route.ts` | ✅ Tạo mới | GET list + DELETE |

---

## File 1: `src/app/api/chat/route.ts`

```typescript
import { NextRequest } from "next/server";
import { createRAGChain } from "@/lib/langchain/chain";

// POST /api/chat
// Body: { messages: [{ role: "user", content: "..." }] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: { role: string; content: string }[] = body.messages;

    if (!messages || messages.length === 0) {
      return Response.json({ error: "No messages provided" }, { status: 400 });
    }

    // Lấy message cuối cùng của user
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") {
      return Response.json({ error: "Last message must be from user" }, { status: 400 });
    }

    const userQuery = lastMessage.content;
    console.log(`[Chat] User query: "${userQuery}"`);

    // createRAGChain() trả về RunnableSequence
    // .stream() là method có sẵn trên mọi Runnable của LangChain — không cần import thêm
    const chain = await createRAGChain();
    const stream = await chain.stream(userQuery);

    // Convert LangChain AsyncIterator → Web ReadableStream để trả về HTTP
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // chain dùng StringOutputParser → chunk là string thuần
            if (chunk) {
              controller.enqueue(encoder.encode(chunk));
            }
          }
        } catch (err) {
          console.error("[Chat] Stream error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("[Chat] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

---

## File 2: `src/app/api/ingest/route.ts`

> File này đã hoàn chỉnh từ Phase 1-4. Đối chiếu để chắc chắn code của bạn giống như dưới đây.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { loadDocument } from "@/lib/langchain/loader";
import { SUPPORTED_EXTENSIONS } from "@/lib/helper/isSupportedFile";
import { insertDocument } from "@/lib/db/queries/documents";
import { splitDocuments } from "@/lib/langchain/splitter";
import { ingestChunks } from "@/lib/langchain/vectorstore";

export async function POST(request: NextRequest) {
  try {
    // 1. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 2. Validate file type
    const ext = path.extname(file.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({
        error: `Unsupported file type: ${ext}`,
        supported: SUPPORTED_EXTENSIONS,
      }, { status: 400 });
    }

    // 3. Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
    }

    // 4. Save file to disk
    const documentsDir = path.join(process.cwd(), "documents");
    await mkdir(documentsDir, { recursive: true });
    const filePath = path.join(documentsDir, file.name);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // 5. Load → Chunk
    const docs = await loadDocument(filePath);
    const chunks = await splitDocuments(docs);
    console.log(`[Ingest] Split into ${chunks.length} chunks`);

    // 6. Save document record
    const record = await insertDocument({
      filename: file.name,
      fileType: ext.replace(".", ""),
      fileSize: file.size,
      content: docs.map(d => d.pageContent).join("\n"),
    });

    // 7. Embed + Store vectors
    const insertedCount = await ingestChunks(record.id, chunks);

    return NextResponse.json({
      success: true,
      documentId: record.id,
      filename: file.name,
      pagesLoaded: docs.length,
      chunksCreated: insertedCount,
    });
  } catch (error: any) {
    console.error("[Ingest] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## File 3: `src/app/api/documents/route.ts`

> GET và DELETE đều nằm trong **cùng 1 file** `route.ts`. Đây là cách Next.js App Router hoạt động.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { documents, embeddings } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

// GET /api/documents
// Trả về danh sách documents kèm số chunks của mỗi file
export async function GET() {
  try {
    const results = await db
      .select({
        id: documents.id,
        filename: documents.filename,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        createdAt: documents.createdAt,
        chunksCount: count(embeddings.id),
      })
      .from(documents)
      .leftJoin(embeddings, eq(documents.id, embeddings.documentId))
      .groupBy(
        documents.id,
        documents.filename,
        documents.fileType,
        documents.fileSize,
        documents.createdAt,
      )
      .orderBy(desc(documents.createdAt));

    return NextResponse.json({ documents: results });
  } catch (error: any) {
    console.error("[Documents GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/documents?id=<uuid>
// Xóa document khỏi DB (CASCADE tự xóa embeddings) và xóa file vật lý
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    }

    // Lấy thông tin file trước khi xóa
    const [doc] = await db
      .select({ filename: documents.filename })
      .from(documents)
      .where(eq(documents.id, id));

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Xóa khỏi DB — CASCADE tự xóa toàn bộ embeddings liên quan
    await db.delete(documents).where(eq(documents.id, id));

    // Xóa file vật lý trên disk
    const filePath = path.join(process.cwd(), "documents", doc.filename);
    try {
      await unlink(filePath);
    } catch {
      // File đã bị xóa trước đó — bỏ qua, không throw
      console.warn(`[Documents DELETE] File not found on disk: ${filePath}`);
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error: any) {
    console.error("[Documents DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Test sau khi hoàn thành

```bash
# 1. Upload file
curl -X POST http://localhost:3000/api/ingest -F "file=@documents/sample.txt"

# 2. Xem danh sách documents
curl http://localhost:3000/api/documents

# 3. Chat với RAG (stream)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "mật khẩu wifi của tàu là gì?"}]}'

# 4. Xóa document (thay <uuid> bằng ID thực)
curl -X DELETE "http://localhost:3000/api/documents?id=<uuid>"
```

---

## ✅ Kết quả mong đợi

- **Chat**: Text stream ra từng token, không chờ full response
- **Documents GET**: Trả về `[{ id, filename, fileType, fileSize, chunksCount, createdAt }]`
- **Documents DELETE**: Xóa cả DB record lẫn file trên disk

**→ [Phase 7: Frontend UI](./phase-7-frontend-ui.md)**
