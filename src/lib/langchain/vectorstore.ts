import { Document } from "@langchain/core/documents";
import { getEmbeddings } from "@/lib/langchain/embeddings";
import { insertEmbeddings, searchSimilarEmbeddings } from "@/lib/db/queries/embeddings";

/**
 * ingestChunks: Wrapper function to generate vectors for chunks and insert them into DB.
 * Supports batching to avoid overwhelming the local Ollama API.
 */
export async function ingestChunks(documentId: string, chunks: Document[]) {
    if (!chunks.length) return 0;

    const embeddings = getEmbeddings();
    let totalInserted = 0;
    
    // Batch process to prevent memory/timeout issues
    const BATCH_SIZE = 20; 
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchChunks = chunks.slice(i, i + BATCH_SIZE);
        const batchTexts = batchChunks.map(c => c.pageContent);
        
        console.log(`[VectorStore] Embedding batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)}...`);
        
        // Tạo vector cho batch
        const vectors = await embeddings.embedDocuments(batchTexts);
        
        // Insert vào DB
        const inserted = await insertEmbeddings(documentId, batchChunks, vectors);
        totalInserted += inserted.length;
    }
    
    console.log(`[VectorStore] Successfully ingested ${totalInserted} total chunks for document ${documentId}`);
    return totalInserted;
}

/**
 * similaritySearch: Vector search wrapper.
 * Embeds user query, and searches DB for topK most similar documents.
 */
export async function similaritySearch(query: string, topK: number = 4) {
    const embeddings = getEmbeddings();
    
    console.log(`[VectorStore] Searching for query: "${query}"`);
    const queryVector = await embeddings.embedQuery(query);
    
    const results = await searchSimilarEmbeddings(queryVector, topK);
    return results;
}
