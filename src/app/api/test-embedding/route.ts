import { NextResponse } from "next/server";
import { getEmbeddings } from "@/lib/langchain/embeddings";

// Helper function to calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function GET() {
  try {
    const embeddings = getEmbeddings();

    const start = performance.now();
    
    // 1. Test embedding query
    const query = "What is RAG?";
    const queryVector = await embeddings.embedQuery(query);
    
    const end = performance.now();
    const executionTimeMs = (end - start).toFixed(2);

    // 2. Bonus: Test Similarity
    const text1 = "Retrieval Augmented Generation";
    const text2 = "What is the weather?";
    
    const [vec1, vec2] = await embeddings.embedDocuments([text1, text2]);
    
    const simRAG = cosineSimilarity(queryVector, vec1).toFixed(4);
    const simWeather = cosineSimilarity(queryVector, vec2).toFixed(4);

    return NextResponse.json({
      success: true,
      executionTimeMs: `${executionTimeMs} ms`,
      query: query,
      dimension: queryVector.length, // Should be 768 for nomic-embed-text
      first10Values: queryVector.slice(0, 10),
      similarityTest: {
        [`"${query}" vs "${text1}"`]: simRAG, // High similarity expected
        [`"${query}" vs "${text2}"`]: simWeather, // Low similarity expected
      }
    });
  } catch (error: any) {
    console.error("[TestEmbedding] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
