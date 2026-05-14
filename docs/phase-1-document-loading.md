# Phase 1: Document Loading (Knowledge Base)

> **Mục tiêu**: Xây dựng module load documents từ nhiều nguồn (PDF, TXT, MD) và API upload file.
>
> 📌 Tương ứng bước **Knowledge Base** trong RAG diagram.

---

## 📋 Checklist

- [ ] Tạo `src/lib/langchain/loader.ts` — Document loaders
- [ ] Tạo `src/lib/db/queries/documents.ts` — CRUD dùng Drizzle
- [ ] Tạo `src/app/api/ingest/route.ts` — Upload & ingest API
- [ ] Tạo sample documents để test

---

## Kiến thức cần biết

### Document Loader là gì?

LangChain cung cấp các "loaders" để đọc nội dung từ nhiều loại file. Mỗi loader trả về `Document[]`:

```typescript
interface Document {
  pageContent: string;     // Nội dung text
  metadata: {
    source: string;        // Đường dẫn file gốc
    [key: string]: any;
  };
}
```

### Drizzle ORM queries

Drizzle dùng type-safe query builder thay vì raw SQL:

```typescript
// INSERT
await db.insert(documents).values({ filename: "test.pdf", ... });

// SELECT
const docs = await db.select().from(documents).orderBy(desc(documents.createdAt));

// DELETE
await db.delete(documents).where(eq(documents.id, docId));
```

---

## Step 1: Tạo Document Queries (`src/lib/db/queries/documents.ts`)

### Bạn cần làm:
1. Import `db` từ `src/lib/db/index.ts`
2. Import `documents` schema từ `src/lib/db/schema.ts`
3. Viết 3 functions:

#### `insertDocument(data)`

```
Input: { filename, fileType, fileSize, content }
Logic: db.insert(documents).values(data).returning()
Return: document record đã insert
```

#### `getDocuments()`

```
Logic: db.select().from(documents).orderBy(desc(documents.createdAt))
Return: tất cả documents, mới nhất trước
```

#### `deleteDocument(id)`

```
Input: document UUID
Logic: db.delete(documents).where(eq(documents.id, id))
Note: CASCADE sẽ tự xóa embeddings liên quan (đã config trong schema)
```

### Imports bạn cần:

```typescript
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
```

> 💡 **Type inference**: Drizzle tự suy ra types từ schema. Bạn có thể dùng `typeof documents.$inferInsert` cho input type và `typeof documents.$inferSelect` cho output type.

---

## Step 2: Tạo Document Loader (`src/lib/langchain/loader.ts`)

### Bạn cần làm:
1. Viết function `loadDocument(filePath: string)` nhận đường dẫn file
2. Detect file type từ extension (`.pdf`, `.txt`, `.md`)
3. Dùng LangChain loader tương ứng
4. Return `Document[]`

### Imports:

```typescript
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import path from "path";
```

### Logic:

```
1. Lấy file extension: path.extname(filePath).toLowerCase()
2. Switch case:
   - .pdf → new PDFLoader(filePath) (mỗi page = 1 Document)
   - .txt, .md → new TextLoader(filePath)
   - khác → throw Error("Unsupported file type")
3. const docs = await loader.load()
4. Enrich metadata: thêm filename, fileType, uploadDate
5. Return docs
```

---

## Step 3: Tạo Upload API (`src/app/api/ingest/route.ts`)

### Bạn cần làm:
1. Tạo `POST` handler nhận `multipart/form-data`
2. Lưu file vào thư mục `documents/`
3. Gọi `loadDocument()` để đọc nội dung
4. Lưu document record vào PostgreSQL via Drizzle
5. Return thông tin document

### Gợi ý:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { loadDocument } from "@/lib/langchain/loader";
import { insertDocument } from "@/lib/db/queries/documents";

export async function POST(request: NextRequest) {
  // 1. Parse form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 2. Validate file type
  const ext = path.extname(file.name).toLowerCase();
  const allowedTypes = [".pdf", ".txt", ".md"];
  if (!allowedTypes.includes(ext)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  // 3. Save file to documents/ directory
  const documentsDir = path.join(process.cwd(), "documents");
  await mkdir(documentsDir, { recursive: true });
  const filePath = path.join(documentsDir, file.name);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  // 4. Load document content
  const docs = await loadDocument(filePath);

  // 5. Save to database via Drizzle
  const [record] = await insertDocument({
    filename: file.name,
    fileType: ext.replace(".", ""),
    fileSize: file.size,
    content: docs.map(d => d.pageContent).join("\n"),
  });

  // 6. Return response
  // Ở phase này chỉ return document info
  // Chunking + Embedding sẽ thêm ở Phase 2-4
  return NextResponse.json({
    success: true,
    document: record,
    pagesLoaded: docs.length,
  });
}
```

> ⚠️ **Ở Phase 1**, API chỉ load + lưu. Chưa chunk hay embed.
> Sẽ mở rộng pipeline ở các phase sau.

---

## Step 4: Test

### Tạo sample documents

Tạo `documents/sample.txt`:
```
RAG (Retrieval-Augmented Generation) is a technique that combines information retrieval with text generation.
It works by first retrieving relevant documents from a knowledge base, then using those documents as context for a language model.
The main components of a RAG system are: Document Loader, Text Splitter, Embedding Model, Vector Store, and Language Model.
```

### Test upload via curl

```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@documents/sample.txt"
```

### Verify trong Drizzle Studio

```bash
pnpm db:studio
# Mở browser → check table "documents"
```

---

## ✅ Kết quả mong đợi

- Có thể đọc nội dung từ PDF, TXT, MD files
- File upload API hoạt động
- Document records lưu vào PostgreSQL qua Drizzle
- Verify bằng Drizzle Studio

**→ Chuyển sang [Phase 2: Chunking](./phase-2-chunking.md)**
