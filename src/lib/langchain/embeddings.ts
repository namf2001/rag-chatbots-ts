import { OllamaEmbeddings } from "@langchain/ollama";

// Singleton instance
let embeddingsInstance: OllamaEmbeddings | null = null;

export function getEmbeddings(): OllamaEmbeddings {
  if (!embeddingsInstance) {
    const model = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

    embeddingsInstance = new OllamaEmbeddings({
      model: model,
      baseUrl: baseUrl,
    });
    console.log(`[Embeddings] Initialized OllamaEmbeddings with model: ${model}`);
  }
  return embeddingsInstance;
}
