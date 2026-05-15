import { db } from "@/lib/db";
import { documents, embeddings } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const results = await db
      .select({
        id: documents.id,
        filename: documents.filename,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        createdAt: documents.createdAt,
        chunksCount: count(embeddings.id),
      })
      .from(documents)
      .leftJoin(embeddings, eq(documents.id, embeddings.documentId))
      .groupBy(
        documents.id,
        documents.filename,
        documents.fileType,
        documents.fileSize,
        documents.createdAt
      )
      .orderBy(desc(documents.createdAt))

    return NextResponse.json({
      documents: results
    })
  } catch (error: any) {
    console.error("[Documents GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing document id" }, { status: 400 })
    }

    const [doc] = await db
      .select({ filename: documents.filename })
      .from(documents)
      .where(eq(documents.id, id))

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }), { status: 404 }
    }

    await db.delete(documents).where(eq(documents.id, id));

    // Xóa file vật lý trên disk
    // const filePath = path.join(process.cwd(), "documents", doc.filename);
    // try {
    //   await unlink(filePath);
    // } catch {
    //   // File đã bị xóa trước đó — bỏ qua, không throw
    //   console.warn(`[Documents DELETE] File not found on disk: ${filePath}`);
    // }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error: any) {
    console.error("[Documents DELETE] error", error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
