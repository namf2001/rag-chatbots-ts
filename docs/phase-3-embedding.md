# Phase 3: Embedding Model

> **Mục tiêu**: Chuyển text chunks thành vector embeddings bằng Ollama.
>
> 📌 Tương ứng bước **Embedding Model** trong RAG diagram.

---

## 📋 Checklist

- [ ] Hiểu embedding là gì
- [ ] Tạo `src/lib/langchain/embeddings.ts`
- [ ] Test embedding với Ollama
- [ ] Verify vector dimension

---

## Kiến thức cần biết

### Embedding là gì?

Embedding = chuyển text thành vector (dãy số) biểu diễn ý nghĩa ngữ nghĩa.

```
"RAG is a technique" → [0.023, -0.156, 0.891, ..., 0.034] (768 dims)
```

- Texts tương tự → vectors gần nhau
- Model `nomic-embed-text`: **768 dimensions**, ~274MB

### 2 methods quan trọng:

```typescript
// Embed 1 text (cho user query)
const queryVector = await embeddings.embedQuery("What is RAG?");

// Embed batch (cho chunks)
const docVectors = await embeddings.embedDocuments(["text1", "text2"]);
```

---

## Step 1: Tạo `src/lib/langchain/embeddings.ts`

### Bạn cần làm:
1. Import `OllamaEmbeddings` từ `@langchain/ollama`
2. Tạo singleton `getEmbeddings()` — cache instance tránh tạo lại
3. Config: `model` = env `OLLAMA_EMBEDDING_MODEL`, `baseUrl` = env `OLLAMA_BASE_URL`

---

## Step 2: Test

Tạo test endpoint `src/app/api/test-embedding/route.ts`:
1. Embed câu "What is RAG?"
2. Return: dimension (should be 768), first 10 values, execution time

### Bonus — Test similarity:
Embed 3 câu, tính cosine similarity:
- "What is RAG?" vs "Retrieval Augmented Generation" → similarity **cao**
- "What is RAG?" vs "What is the weather?" → similarity **thấp**

---

## ✅ Kết quả mong đợi

- `getEmbeddings()` returns singleton OllamaEmbeddings
- Text → vector 768 dimensions
- Similar texts → high cosine similarity

**→ [Phase 4: Vector Database](./phase-4-vector-database.md)**
