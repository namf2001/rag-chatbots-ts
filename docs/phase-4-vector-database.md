# Phase 4: Vector Database (Drizzle + pgvector)

> **Mục tiêu**: Lưu embeddings vào PostgreSQL pgvector qua Drizzle ORM và thực hiện similarity search.
>
> 📌 Tương ứng bước **Vector Database** trong RAG diagram.

---

## 📋 Checklist

- [ ] Tạo `src/lib/db/queries/embeddings.ts` — Drizzle vector queries
- [ ] Tạo `src/lib/langchain/vectorstore.ts` — Ingestion + Search wrapper
- [ ] Tích hợp full pipeline: Load → Chunk → Embed → Store
- [ ] Test end-to-end ingestion + similarity search

---

## Kiến thức cần biết

### Drizzle + pgvector

Drizzle ORM có **native support** cho pgvector. Schema đã định nghĩa ở Phase 0:

```typescript
// Đã có trong schema.ts
embedding: vector("embedding", { dimensions: 768 }).notNull(),
```

### Drizzle cosine distance helper

```typescript
import { cosineDistance, desc, gt, sql } from "drizzle-orm";

// cosineDistance(column, vector) → trả về cosine distance (0 = giống nhất, 2 = khác nhất)
// similarity = 1 - cosineDistance (0 = khác nhất, 1 = giống nhất)
```

---

## Step 1: Tạo Embedding Queries (`src/lib/db/queries/embeddings.ts`)

### Bạn cần implement 3 functions:

#### 1.1. `insertEmbeddings(documentId, chunks, vectors)`

```
Input:
  - documentId: UUID
  - chunks: Document[] (from splitter)
  - vectors: number[][] (from embeddings model)

Logic:
  1. Map chunks + vectors thành insert values
  2. Batch insert dùng Drizzle:
     db.insert(embeddings).values(items)

Gợi ý:
  const values = chunks.map((chunk, i) => ({
    documentId: documentId,
    content: chunk.pageContent,
    metadata: chunk.metadata,
    embedding: vectors[i],
  }));
  await db.insert(embeddings).values(values);
```

> 💡 **Batch insert**: Drizzle handle batch insert tự động khi truyền array vào `.values()`.

#### 1.2. `searchSimilar(queryVector, topK)`

Đây là function QUAN TRỌNG NHẤT — trái tim của similarity search.

```typescript
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { embeddings } from "@/lib/db/schema";

// Logic:
// 1. Tính similarity = 1 - cosineDistance(embedding, queryVector)
// 2. Filter: chỉ lấy similarity > threshold (ví dụ: 0.3)
// 3. Order by similarity DESC
// 4. Limit topK

// Drizzle query:
const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryVector)})`;

const results = await db
  .select({
    id: embeddings.id,
    content: embeddings.content,
    metadata: embeddings.metadata,
    similarity: similarity,
  })
  .from(embeddings)
  .where(gt(similarity, 0.3))  // minimum threshold
  .orderBy(desc(similarity))
  .limit(topK);
```

#### 1.3. `deleteEmbeddingsByDocumentId(documentId)`

```
Logic: db.delete(embeddings).where(eq(embeddings.documentId, documentId))
Note: Hoặc dùng CASCADE từ documents table (đã config)
```

---

## Step 2: Tạo `src/lib/langchain/vectorstore.ts`

### Wrapper layer kết nối embeddings model + database queries.

#### `ingestChunks(documentId, chunks)`

```
Input:
  - documentId: UUID từ documents table
  - chunks: Document[] (output từ Phase 2)

Logic:
  1. Lấy embeddings instance (Phase 3): getEmbeddings()
  2. Extract texts: chunks.map(c => c.pageContent)
  3. Gọi embeddings.embedDocuments(texts) → vectors[]
  4. Gọi insertEmbeddings(documentId, chunks, vectors)
  5. Return count inserted

Lưu ý:
  - embedDocuments có thể chậm nếu nhiều chunks
  - Consider batch: chia chunks thành nhóm 10-20, embed từng nhóm
```

#### `similaritySearch(query, topK?)`

```
Input:
  - query: string (user question)
  - topK: number (default từ env)

Logic:
  1. Embed query: getEmbeddings().embedQuery(query) → queryVector
  2. Gọi searchSimilar(queryVector, topK)
  3. Convert results → LangChain Document format
  4. Return { documents, scores }
```

---

## Step 3: Tích hợp Full Ingestion Pipeline

### Update `src/app/api/ingest/route.ts`

Thêm chunking + embedding vào flow:

```
Current (Phase 1):
  Upload → Load → Save document record

Updated (Phase 4):
  Upload → Load → Chunk → Save document record → Embed + Store vectors
```

```typescript
// Pseudocode update:

// 1-3. (giữ nguyên Phase 1: parse, validate, save file)

// 4. Load document
const docs = await loadDocument(filePath);

// 5. Split into chunks (Phase 2)
const chunks = await splitDocuments(docs);

// 6. Save document record (Phase 1)
const [record] = await insertDocument({...});

// 7. NEW: Embed + Store vectors
const insertedCount = await ingestChunks(record.id, chunks);

// 8. Return
return NextResponse.json({
  success: true,
  documentId: record.id,
  filename: file.name,
  chunksCount: insertedCount,
});
```

---

## Step 4: Test

### 4.1. Test full ingestion

```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@documents/sample.txt"

# Expected: { success: true, chunksCount: 5, ... }
```

### 4.2. Verify trong Drizzle Studio

```bash
pnpm db:studio
# Check table "embeddings" → phải thấy records với vector data
```

### 4.3. Test similarity search

Tạo `src/app/api/test-search/route.ts`:

```typescript
// GET /api/test-search?q=What is RAG?
// 1. Lấy query từ searchParams
// 2. Gọi similaritySearch(query, 3)
// 3. Return results + similarity scores
```

### 4.4. Verify bằng SQL (optional)

```bash
docker exec -it rag-postgres psql -U raguser -d ragchatbot -c "
  SELECT content, vector_dims(embedding) as dims
  FROM embeddings LIMIT 3;
"
```

---

## ✅ Kết quả mong đợi

- Full ingestion pipeline: upload → load → chunk → embed → store
- Drizzle queries hoạt động type-safe
- Similarity search trả về relevant chunks với scores
- Verify qua Drizzle Studio

**→ [Phase 5: LLM & RAG Chain](./phase-5-llm-rag-chain.md)**
