import { Document } from "@langchain/core/documents";
import { cosineDistance, desc, eq, SQL, asc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { embeddings } from "@/lib/db/schema";

export async function insertEmbeddings(documentId: string, chunks: Document[], vectors: number[][]) {
    // Validate input
    if (!chunks.length) return [];
    if (chunks.length !== vectors.length) {
        throw new Error("Mismatch between number of chunks and vectors");
    }

    try {
        const values = chunks.map((chunk, i) => ({
            documentId: documentId,
            content: chunk.pageContent,
            metadata: chunk.metadata,
            embedding: vectors[i],
        }));

        // Thực hiện insert và return các record đã được tạo
        const inserted = await db.insert(embeddings).values(values).returning();
        console.log(`[insertEmbeddings] Successfully inserted ${inserted.length} vectors for document ${documentId}`);
        
        return inserted;
    } catch (error) {
        console.error("[insertEmbeddings] Database error:", error);
        throw error;
    }
}

export async function searchSimilarEmbeddings(
    queryVector: number[], 
    topK: number = 5,
    documentId?: string
): Promise<{
    similarity: number;
    chunk: Document;
}[]> {
    try {
        // cosineDistance() của Drizzle tự động cast number[] → vector đúng chuẩn pgvector
        const distance = cosineDistance(embeddings.embedding, queryVector);

        // Tạo điều kiện lọc
        const conditions: SQL[] = [];
        if (documentId) {
            conditions.push(eq(embeddings.documentId, documentId));
        }

        const results = await db
            .select({
                // similarity = 1 - cosine distance
                distance: distance,
                content: embeddings.content,
                metadata: embeddings.metadata,
            })
            .from(embeddings)
            .where(and(...conditions))
            .orderBy(asc(distance))  // khoảng cách nhỏ nhất = giống nhất
            .limit(topK);

        // Chuyển kết quả thành định dạng Document
        return results.map(row => ({
            similarity: 1 - Number(row.distance),  // convert distance → similarity score
            chunk: new Document({
                pageContent: row.content,
                metadata: row.metadata || {},
            }),
        }));
    } catch (error) {
        console.error("[searchSimilarEmbeddings] Database error:", error);
        throw error;
    }
}

export async function deleteAllEmbeddings(documentId: string) {
    try {
        const deleted = await db
            .delete(embeddings)
            .where(eq(embeddings.documentId, documentId))
            .returning();
        console.log(`[deleteAllEmbeddings] Deleted ${deleted.length} embeddings for document ${documentId}`);
        return deleted;
    } catch (error) {
        console.error("[deleteAllEmbeddings] Database error:", error);
        throw error;
    }
}
