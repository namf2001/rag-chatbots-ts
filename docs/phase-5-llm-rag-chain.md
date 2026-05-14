# Phase 5: LLM & RAG Chain

> **Mục tiêu**: Kết nối Retriever + LLM thành RAG chain hoàn chỉnh.
>
> 📌 Tương ứng bước **LLM** + **Prompt (Context + Query)** trong RAG diagram.

---

## 📋 Checklist

- [ ] Tạo `src/lib/langchain/llm.ts` — ChatOllama setup
- [ ] Tạo `src/lib/langchain/chain.ts` — RAG chain với LCEL
- [ ] Hiểu Prompt Template
- [ ] Test RAG chain end-to-end

---

## Kiến thức cần biết

### RAG Chain = Retriever + Prompt + LLM

```
User: "What is RAG?"
    ↓
Retriever (Phase 4)
    → 4 relevant chunks
    ↓
Prompt Template:
    "Based on this context: {chunks}
     Answer: {user_question}"
    ↓
LLM (Ollama llama3)
    → "RAG is a technique that..."
```

### LCEL (LangChain Expression Language)

LCEL là cách "nối" các components bằng pipe operator. Think of it as middleware chain:

```typescript
const chain = retriever.pipe(formatDocs).pipe(prompt).pipe(llm).pipe(outputParser);
```

---

## Step 1: Tạo `src/lib/langchain/llm.ts`

### Bạn cần làm:
1. Import `ChatOllama` từ `@langchain/ollama`
2. Tạo function `getLLM()` — return ChatOllama instance
3. Config: model, baseUrl, temperature, streaming

```typescript
import { ChatOllama } from "@langchain/ollama";

// Config:
// - model: env OLLAMA_LLM_MODEL || "llama3"
// - baseUrl: env OLLAMA_BASE_URL || "http://localhost:11434"
// - temperature: 0.7 (creativity level: 0=exact, 1=creative)
// - streaming: true (quan trọng cho UX)
```

### Test nhanh (không cần RAG):

```typescript
const llm = getLLM();
const response = await llm.invoke("What is 2+2?");
console.log(response.content); // "4"
```

---

## Step 2: Tạo `src/lib/langchain/chain.ts`

### Đây là file QUAN TRỌNG NHẤT — nơi mọi thứ kết nối lại.

### 2.1. System Prompt Template

Bạn cần thiết kế prompt template. Đây là "instructions" cho LLM:

```
SYSTEM PROMPT:
You are a helpful AI assistant. Answer based on the provided context.
If the context doesn't contain relevant information, say so.

Context:
{context}        ← chunks từ vector DB sẽ inject vào đây

USER:
{input}          ← câu hỏi của user
```

### 2.2. Có 2 cách build RAG chain:

#### Cách A: Dùng built-in chains (Đơn giản hơn)

```typescript
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// 1. Tạo prompt
// 2. Tạo combineDocsChain = createStuffDocumentsChain({ llm, prompt })
// 3. Tạo ragChain = createRetrievalChain({ retriever, combineDocsChain })
// 4. Gọi: const result = await ragChain.invoke({ input: "What is RAG?" })
//    → result.answer = "..."
//    → result.context = [Document, Document, ...]
```

#### Cách B: Dùng LCEL (Linh hoạt hơn, nên học)

```typescript
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

// 1. Tạo retriever từ Phase 4
// 2. Tạo function formatDocs(docs) → join contents thành string
// 3. Build chain:
//    const chain = RunnableSequence.from([
//      {
//        context: retriever.pipe(formatDocs),
//        input: new RunnablePassthrough(),
//      },
//      prompt,
//      llm,
//      new StringOutputParser(),
//    ]);
// 4. Gọi: const answer = await chain.invoke("What is RAG?")
```

> 💡 **Recommend**: Bắt đầu với **Cách A** (đơn giản), sau đó refactor sang **Cách B** khi muốn customize.

### 2.3. Export function `createRAGChain()`

```typescript
// Function này return chain sẵn sàng invoke/stream
// Sẽ được gọi từ API route ở Phase 6
export async function createRAGChain() {
  // ... build chain
  return chain;
}
```

---

## Step 3: Test RAG Chain

Tạo test endpoint `src/app/api/test-rag/route.ts`:

```typescript
// GET /api/test-rag?q=What is RAG?
// 1. Tạo RAG chain
// 2. Invoke với query
// 3. Return: answer + source documents

// Expected response:
{
  "query": "What is RAG?",
  "answer": "RAG (Retrieval-Augmented Generation) is a technique...",
  "sources": [
    { "content": "...", "metadata": { "source": "sample.txt" } }
  ]
}
```

### Verify:
- [ ] Answer dựa trên content từ documents đã ingest?
- [ ] Sources trả về đúng chunks liên quan?
- [ ] Nếu hỏi ngoài phạm vi documents, LLM có nói "không biết"?

---

## 📝 Prompt Engineering Tips

```
❌ Bad prompt:
"Answer the question: {input}"
→ LLM sẽ dùng kiến thức chung, không dùng context

✅ Good prompt:
"Answer ONLY based on the provided context.
If the context doesn't have the answer, say 'I don't have information about this.'

Context: {context}
Question: {input}"
→ LLM bị ép dùng context, giảm hallucination
```

---

## ✅ Kết quả mong đợi

- LLM trả lời dựa trên context từ documents
- Source attribution hoạt động
- RAG chain sẵn sàng stream (cho Phase 6)

**→ [Phase 6: API Routes](./phase-6-api-routes.md)**
