import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { loadDocument } from "@/lib/langchain/loader"
import { SUPPORTED_EXTENSIONS } from "@/lib/helper/isSupportedFile";
import { insertDocument } from "@/lib/db/queries/documents";
import { splitDocuments } from "@/lib/langchain/splitter"
import { ingestChunks } from "@/lib/langchain/vectorstore";

export async function POST(request: NextRequest) {
  // 1. Parse form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provider" }, { status: 400 })
  }

  // 2. Validate file type
  const ext = path.extname(file.name).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({
      error: `Unsupported file type: ${ext}`,
      supported: SUPPORTED_EXTENSIONS,
    }, { status: 400 });
  }

  // 3. Validate file size (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  // 4. Save file to documents/ directory
  const documentsDir = path.join(process.cwd(), "documents");
  await mkdir(documentsDir, { recursive: true });
  const filePath = path.join(documentsDir, file.name);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  // 5. Load document content
  const docs = await loadDocument(filePath);

  // NEW: Split into chunks (Phase 2)
  const chunks = await splitDocuments(docs);
  console.log(`[Ingest] Split into ${chunks.length} chunks`);

  // 6. Save to database via Drizzle
  const record = await insertDocument({
    filename: file.name,
    fileType: ext.replace(".", ""),
    fileSize: file.size,
    content: docs.map(d => d.pageContent).join("\n"),
  });

  const insertedCount = await ingestChunks(record.id, chunks);

  // 7. Return response
  return NextResponse.json({
    success: true,
    document: record,
    pagesLoaded: docs.length,
    chunksCreated: insertedCount,
  });
}