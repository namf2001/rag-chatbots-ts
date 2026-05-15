import { ChatOllama } from "@langchain/ollama";

// Singleton instance
let llmInstance: ChatOllama | null = null;

// getLLM returns a singleton ChatOllama instance configured from environment variables.
export function getLLM(streaming = true): ChatOllama {
  if (!llmInstance) {
    const model = process.env.OLLAMA_LLM_MODEL || "llama3";
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

    llmInstance = new ChatOllama({
      model,
      baseUrl,
      temperature: 0.7,   // 0 = chính xác/lặp lại, 1 = sáng tạo/random
      streaming,
    });

    console.log(`[LLM] Initialized ChatOllama with model: ${model}`);
  }
  return llmInstance;
}
