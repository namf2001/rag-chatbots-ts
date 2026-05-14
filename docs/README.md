# 🤖 RAG Chatbot — Learning Guide

> Build a RAG (Retrieval-Augmented Generation) Chatbot from scratch.  
> Stack: **Next.js** + **LangChain.js** + **Ollama** + **Drizzle ORM** + **PostgreSQL pgvector** + **shadcn/ui**

---

## Architecture

```
Knowledge Base → Chunking → Embedding → Vector DB (pgvector)
                                              ↓
User Query → Embed Query → Similarity Search → Context + Query → LLM → Streamed Response
```

---

## Phases

| # | Phase | Guide | Description |
|:--|:------|:------|:------------|
| 0 | **Setup** | [phase-0-setup.md](./phase-0-setup.md) | Docker, Ollama, Drizzle ORM, pnpm deps |
| 1 | **Document Loading** | [phase-1-document-loading.md](./phase-1-document-loading.md) | Load PDF/TXT/MD, Drizzle queries, upload API |
| 2 | **Chunking** | [phase-2-chunking.md](./phase-2-chunking.md) | RecursiveCharacterTextSplitter, overlap |
| 3 | **Embedding** | [phase-3-embedding.md](./phase-3-embedding.md) | Ollama nomic-embed-text, vector 768d |
| 4 | **Vector Database** | [phase-4-vector-database.md](./phase-4-vector-database.md) | Drizzle + pgvector, cosineDistance, retriever |
| 5 | **LLM & RAG Chain** | [phase-5-llm-rag-chain.md](./phase-5-llm-rag-chain.md) | ChatOllama, LCEL chain, prompt template |
| 6 | **API Routes** | [phase-6-api-routes.md](./phase-6-api-routes.md) | Chat streaming, ingestion, document CRUD |
| 7 | **Frontend UI** | [phase-7-frontend-ui.md](./phase-7-frontend-ui.md) | Chat UI, shadcn/ui, dark theme, animations |
| 8 | **Polish & Auth** | [phase-8-polish-auth.md](./phase-8-polish-auth.md) | NextAuth v4, chat history, memory, errors |

---

## Quick Start

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Enable pgvector
docker exec -it rag-postgres psql -U raguser -d ragchatbot -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 3. Install deps
pnpm install

# 4. Run migrations
pnpm db:push

# 5. Start Ollama
ollama serve

# 6. Start dev server
pnpm dev
```

---

## Tech Stack

| Component | Technology |
|:----------|:-----------|
| Framework | Next.js 16 (App Router) |
| Package Manager | pnpm |
| UI | shadcn/ui + Tailwind CSS v4 |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 + pgvector (Docker) |
| LLM | Ollama (llama3 / mistral) |
| Embeddings | Ollama (nomic-embed-text) |
| Orchestration | LangChain.js |
| Auth | NextAuth v4 (Phase 8) |
| Streaming | Vercel AI SDK |
