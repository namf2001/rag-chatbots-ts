# Phase 2: Chunking (Text Splitting)

> **Mục tiêu**: Chia documents thành các chunks nhỏ, có overlap, để embedding hiệu quả.
>
> 📌 Tương ứng bước **Chunking** trong RAG diagram.

---

## 📋 Checklist

- [ ] Hiểu tại sao cần chunking
- [ ] Tạo `src/lib/langchain/splitter.ts`
- [ ] Tích hợp splitter vào ingestion pipeline
- [ ] Test với sample documents

---

## Kiến thức cần biết

### Tại sao cần Chunking?

```
Document gốc (10,000 từ)
    ↓ Nếu embed nguyên document
    ↓ → Vector quá "tổng quát", mất chi tiết
    ↓ → Không fit vào LLM context window
    
Document gốc (10,000 từ)
    ↓ Chunk thành 10 phần (mỗi phần ~1000 từ)
    ↓ → Mỗi chunk mang ý nghĩa cụ thể
    ↓ → Retrieval chính xác hơn
    ↓ → LLM nhận đúng context cần thiết
```

### Overlap là gì?

```
Chunk 1: [-------1000 chars-------]
                            [overlap]
Chunk 2:              [-------1000 chars-------]
                                          [overlap]
Chunk 3:                            [-------1000 chars-------]
```

- **chunk_size = 1000**: Mỗi chunk tối đa 1000 ký tự
- **chunk_overlap = 200**: 200 ký tự cuối của chunk trước = 200 ký tự đầu chunk sau
- **Tại sao overlap?**: Tránh mất ngữ cảnh ở ranh giới giữa 2 chunks

### RecursiveCharacterTextSplitter

LangChain cung cấp nhiều loại splitter. `RecursiveCharacterTextSplitter` là phổ biến nhất vì nó split "thông minh":

```
Thứ tự ưu tiên split:
1. "\n\n" (paragraph) — ưu tiên cao nhất
2. "\n"   (line break)
3. "."    (sentence)  
4. " "    (word)
5. ""     (character) — fallback cuối cùng
```

→ Nó cố gắng giữ nguyên paragraph/sentence thay vì cắt giữa chừng.

---

## Step 1: Tạo Splitter (`src/lib/langchain/splitter.ts`)

### Bạn cần làm:
1. Import `RecursiveCharacterTextSplitter` từ `langchain/text_splitter`
2. Tạo function `createSplitter()` — khởi tạo splitter với config từ env
3. Tạo function `splitDocuments(docs)` — nhận Document[] và trả về chunks[]
4. Enrich metadata mỗi chunk: thêm `chunkIndex`, giữ metadata gốc

### Import:

```typescript
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
```

### Logic cho `createSplitter()`:

```
1. Đọc CHUNK_SIZE, CHUNK_OVERLAP từ env (default: 1000, 200)
2. Return new RecursiveCharacterTextSplitter({
     chunkSize: ...,
     chunkOverlap: ...,
     separators: ["\n\n", "\n", ".", " ", ""],
   })
```

### Logic cho `splitDocuments(docs)`:

```
1. Gọi createSplitter()
2. Gọi splitter.splitDocuments(docs)  → trả về Document[]
3. Map qua kết quả, enrich metadata:
   - Giữ metadata gốc (source, filename, ...)
   - Thêm chunkIndex (vị trí chunk trong document)
   - Thêm totalChunks (tổng số chunks)
4. Return enriched chunks
```

---

## Step 2: Tích hợp vào Ingestion Pipeline

### Bạn cần làm:
Update `src/app/api/ingest/route.ts` để thêm bước chunking:

```
Current flow:
  Upload → Load → Save to DB

Updated flow:
  Upload → Load → ✨ Chunk ✨ → Save to DB
```

### Logic update:

```typescript
// Trong POST handler, sau khi load document:

// 1. Load document (Phase 1)
const docs = await loadDocument(filePath);

// 2. NEW: Split into chunks (Phase 2)
const chunks = await splitDocuments(docs);

// 3. Save document record (đã có)
// 4. Log: console.log(`Split into ${chunks.length} chunks`);
```

> ⚠️ Chưa cần lưu chunks vào DB ở phase này. Chỉ cần verify chunking hoạt động đúng.
> Lưu vào vector DB sẽ ở Phase 4.

---

## Step 3: Test Chunking

### Tạo test endpoint

Tạo hoặc update `src/app/api/test-loader/route.ts`:

```typescript
// 1. Load sample document
// 2. Split into chunks
// 3. Return:
//    - Số lượng chunks
//    - Mỗi chunk: content preview (100 chars), metadata, length
```

### Kiểm tra kết quả:

```
GET http://localhost:3000/api/test-loader

Expected response:
{
  "originalDocs": 1,
  "totalChunks": 5,
  "chunks": [
    {
      "preview": "RAG (Retrieval-Augmented Generation) is a technique...",
      "length": 987,
      "metadata": {
        "source": "documents/sample.txt",
        "chunkIndex": 0,
        "totalChunks": 5
      }
    },
    ...
  ]
}
```

### Verify checklist:
- [ ] Mỗi chunk <= `CHUNK_SIZE` characters?
- [ ] Có overlap giữa chunk liên tiếp? (Cuối chunk N = Đầu chunk N+1)
- [ ] Metadata gốc được giữ lại?
- [ ] `chunkIndex` đánh số đúng?

---

## 📝 Điều chỉnh parameters

| Parameter | Nhỏ hơn | Lớn hơn |
|:---|:---|:---|
| **chunk_size** | Chunks chi tiết hơn, retrieval chính xác hơn, nhưng mất ngữ cảnh rộng | Chunks tổng quát hơn, giữ ngữ cảnh tốt, nhưng retrieval kém chính xác |
| **chunk_overlap** | Ít redundancy, tiết kiệm storage | Giữ context giữa chunks tốt hơn, nhưng tốn storage |

### Recommended cho bắt đầu:
- `CHUNK_SIZE=1000` — balanced
- `CHUNK_OVERLAP=200` — 20% overlap

---

## ✅ Kết quả mong đợi

Sau khi hoàn thành Phase 2:
- Documents được split thành chunks hợp lý
- Mỗi chunk có metadata đầy đủ (source, chunkIndex, totalChunks)
- Chunks không quá dài, không quá ngắn
- Overlap hoạt động đúng

**→ Chuyển sang [Phase 3: Embedding](./phase-3-embedding.md)**
