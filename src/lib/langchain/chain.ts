import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { Document } from "@langchain/core/documents";
import { getLLM } from "@/lib/langchain/llm";
import { similaritySearch } from "@/lib/langchain/vectorstore";

// formatContext joins retrieved Document chunks into a single string to inject into the prompt.
function formatContext(docs: { chunk: Document; similarity: number }[]): string {
  return docs
    .map((d, i) => `[Source ${i + 1}] (score: ${d.similarity.toFixed(3)})\n${d.chunk.pageContent}`)
    .join("\n\n---\n\n");
}

// RAG system prompt — buộc LLM chỉ trả lời dựa trên context được cung cấp.
const RAG_SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based ONLY on the provided context.

Rules:
- Answer ONLY based on the provided context. Do not use your general knowledge.
- If the context does not contain enough information to answer, respond with: "I don't have information about this in the provided documents."
- Be concise and direct.
- Cite which source(s) you used when possible.

Context:
{context}`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", RAG_SYSTEM_PROMPT],
  ["human", "{input}"],
]);

// createRAGChain builds and returns the LCEL RAG chain.
// The chain: retrieve → format context → prompt → LLM → parse output
export async function createRAGChain(topK = 4) {
  const llm = getLLM();

  const chain = RunnableSequence.from([
    {
      // Retrieval + context formatting
      context: async (input: string) => {
        const results = await similaritySearch(input, topK);
        return formatContext(results);
      },
      // Pass the user query through unchanged
      input: new RunnablePassthrough(),
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  return chain;
}

// askRAG runs the RAG chain and returns the answer alongside source documents.
export async function askRAG(query: string, topK = 4) {
  // Retrieve sources first for attribution
  const sources = await similaritySearch(query, topK);
  const context = formatContext(sources);

  const llm = getLLM(false); // Non-streaming for this helper
  const formattedPrompt = await prompt.formatMessages({
    context,
    input: query,
  });

  const response = await llm.invoke(formattedPrompt);

  return {
    answer: response.content as string,
    sources: sources.map((s) => ({
      content: s.chunk.pageContent,
      metadata: s.chunk.metadata,
      similarity: s.similarity,
    })),
  };
}
