import { db } from "@/lib/db/index";
import { documents } from "@/lib/db/schema";
import { UUID } from "crypto";
import { desc, eq } from "drizzle-orm";

// InsertDocument inserts a new document record into the database.
export async function insertDocument(data: typeof documents.$inferInsert) {
  try {
    const [record] = await db.insert(documents).values(data).returning();
    return record;
  } catch (error) {
    console.error("[insertDocument] failed to insert document:", error);
    throw new Error(`Failed to insert document "${data.filename}": ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// GetAllDocuments get all documents record from the database.
export async function getAllDocuments() {
  try {
    const records = await db.select().from(documents).orderBy(desc(documents.createdAt));
    return records;
  } catch (error) {
    console.error("[getAllDocuments] failed to insert document:", error);
    throw new Error(`Failed to get all document: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// deleteDocument deletes a document record from the database by id.
export async function deleteDocument(id: string) {
  try {
    const [record] = await db.delete(documents).where(eq(documents.id, id)).returning();
    return record;
  } catch (error) {
    console.error("[deleteDocument] failed to delete document:", error);
    throw new Error(`Failed to delete document "${id}": ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}