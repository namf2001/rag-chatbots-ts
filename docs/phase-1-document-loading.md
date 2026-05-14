# Phase 1: Document Loading (Knowledge Base)

> **Mục tiêu**: Xây dựng module load documents từ nhiều nguồn (PDF, XLSX, CSV, DOCX, TXT, MD) và API upload file.
>
> 📌 Tương ứng bước **Knowledge Base** trong RAG diagram.

---

## 📋 Checklist

- [ ] Cài thêm dependencies cho các file types
- [ ] Tạo `src/lib/langchain/loader.ts` — Document loaders (multi-type)
- [ ] Tạo `src/lib/db/queries/documents.ts` — CRUD dùng Drizzle
- [ ] Tạo `src/app/api/ingest/route.ts` — Upload & ingest API
- [ ] Test với sample documents (txt, pdf, xlsx, csv)

---

## Kiến thức cần biết

### Document Loader là gì?

Mỗi loại file cần 1 loader riêng để extract text. Tất cả loaders trả về cùng format `Document[]`:

```typescript
interface Document {
  pageContent: string;     // Nội dung text đã extract
  metadata: {
    source: string;        // Đường dẫn file gốc
    [key: string]: any;    // sheet name, page number, ...
  };
}
```

### Supported File Types

| Extension | Loader | Package | Ghi chú |
|:--|:--|:--|:--|
| `.pdf` | `PDFLoader` | `@langchain/community` | Mỗi page = 1 Document |
| `.csv` | `CSVLoader` | `@langchain/community` | Mỗi row = 1 Document |
| `.docx` | `DocxLoader` | `@langchain/community` | Cần `mammoth` |
| `.xlsx` | `xlsx` (SheetJS) | `xlsx` | Convert sheet → text, tự wrap Document |
| `.txt` `.md` | `readFile` + `Document` | built-in Node.js | Đọc raw text |

### Cài dependencies

```bash
# PDF parser
pnpm add pdf-parse
pnpm add -D @types/pdf-parse

# Excel parser
pnpm add xlsx

# DOCX parser (mammoth là peer dependency của DocxLoader)
pnpm add mammoth
```

---

## Step 1: Tạo Document Queries (`src/lib/db/queries/documents.ts`)

### Bạn cần làm:
1. Import `db` từ `src/lib/db/index.ts`
2. Import `documents` schema từ `src/lib/db/schema.ts`
3. Viết 3 functions:

#### `insertDocument(data)`

```
Input: { filename, fileType, fileSize, content }
Logic: db.insert(documents).values(data).returning()
Return: document record đã insert
```

#### `getAllDocuments()`

```
Logic: db.select().from(documents).orderBy(desc(documents.createdAt))
Return: tất cả documents, mới nhất trước
```

#### `deleteDocument(id)`

```
Input: document id (string)
Logic: db.delete(documents).where(eq(documents.id, id))
Note: CASCADE sẽ tự xóa embeddings liên quan (đã config trong schema)
```

### Imports bạn cần:

```typescript
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
```

> 💡 **Type inference**: Dùng `typeof documents.$inferInsert` cho input type, `typeof documents.$inferSelect` cho output type.

---

## Step 2: Tạo Document Loader (`src/lib/langchain/loader.ts`)

### Bạn cần làm:
1. Viết function `loadDocument(filePath: string)` nhận đường dẫn file
2. Detect file type từ extension
3. Dùng loader tương ứng để extract text
4. Enrich metadata và return `Document[]`

### Imports:

```typescript
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { Document } from "@langchain/core/documents";
import { readFile } from "fs/promises";
import * as XLSX from "xlsx";
import path from "path";
```

### Logic:

```
function loadDocument(filePath):
  1. ext = path.extname(filePath).toLowerCase()
  2. filename = path.basename(filePath)

  3. Switch(ext):

     case ".pdf":
       → const loader = new PDFLoader(filePath)
       → return await loader.load()
       // Mỗi page PDF = 1 Document, metadata có page number

     case ".csv":
       → const loader = new CSVLoader(filePath)
       → return await loader.load()
       // Mỗi row CSV = 1 Document, metadata có line number

     case ".docx":
       → const loader = new DocxLoader(filePath)
       → return await loader.load()
       // Toàn bộ docx = 1 Document

     case ".xlsx", ".xls":
       → const workbook = XLSX.readFile(filePath)
       → Loop qua workbook.SheetNames:
           - Convert mỗi sheet → CSV string: XLSX.utils.sheet_to_csv(sheet)
           - Tạo new Document({
               pageContent: csvString,
               metadata: { source: filePath, sheet: sheetName }
             })
       → Return Document[] (1 doc per sheet)

     case ".txt", ".md":
       → const text = await readFile(filePath, "utf-8")
       → Return [new Document({
           pageContent: text,
           metadata: { source: filePath }
         })]

     default:
       → throw new Error(`Unsupported file type: ${ext}`)

  4. Enrich metadata cho tất cả docs:
     - filename: tên file gốc
     - fileType: extension (không có dấu chấm)
     - uploadDate: new Date().toISOString()
```

### Lưu ý:
- `PDFLoader` cần package `pdf-parse` (peer dependency)
- `DocxLoader` cần package `mammoth` (peer dependency)
- `XLSX` xử lý cả `.xlsx` và `.xls`
- `CSVLoader` mặc định tách mỗi row thành 1 Document — nếu file lớn sẽ tạo rất nhiều documents

### (Optional) Helper: Lấy danh sách allowed extensions

```typescript
export const SUPPORTED_EXTENSIONS = [".pdf", ".csv", ".docx", ".xlsx", ".xls", ".txt", ".md"];

export function isSupportedFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}
```

---

## Step 3: Tạo Upload API (`src/app/api/ingest/route.ts`)

### Bạn cần làm:
1. Tạo `POST` handler nhận `multipart/form-data`
2. Validate file type dùng `SUPPORTED_EXTENSIONS`
3. Lưu file vào thư mục `documents/`
4. Gọi `loadDocument()` để đọc nội dung
5. Lưu document record vào PostgreSQL via Drizzle
6. Return thông tin document

### Gợi ý:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { loadDocument, SUPPORTED_EXTENSIONS } from "@/lib/langchain/loader";
import { insertDocument } from "@/lib/db/queries/documents";

export async function POST(request: NextRequest) {
  // 1. Parse form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

  // 6. Save to database via Drizzle
  const record = await insertDocument({
    filename: file.name,
    fileType: ext.replace(".", ""),
    fileSize: file.size,
    content: docs.map(d => d.pageContent).join("\n"),
  });

  // 7. Return response
  return NextResponse.json({
    success: true,
    document: record,
    pagesLoaded: docs.length,
  });
}
```

> ⚠️ **Ở Phase 1**, API chỉ load + lưu. Chưa chunk hay embed.
> Sẽ mở rộng pipeline ở các phase sau.

---

## Step 4: Test

### Tạo sample documents

**documents/sample.txt:**
```
RAG (Retrieval-Augmented Generation) is a technique that combines information retrieval with text generation.
```

### Test upload các loại file

```bash
# Text file
curl -X POST http://localhost:3000/api/ingest -F "file=@documents/sample.txt"

# PDF file
curl -X POST http://localhost:3000/api/ingest -F "file=@documents/sample.pdf"

# Excel file
curl -X POST http://localhost:3000/api/ingest -F "file=@documents/data.xlsx"

# CSV file
curl -X POST http://localhost:3000/api/ingest -F "file=@documents/data.csv"

# Unsupported type → should return 400
curl -X POST http://localhost:3000/api/ingest -F "file=@documents/image.png"
```

### Verify trong Drizzle Studio

```bash
pnpm db:studio
# Mở browser → check table "documents"
```

---

## ✅ Kết quả mong đợi

- Có thể đọc nội dung từ **PDF, XLSX, CSV, DOCX, TXT, MD** files
- File upload API hoạt động với validation (type + size)
- Document records lưu vào PostgreSQL qua Drizzle
- Unsupported file types trả về lỗi rõ ràng
- Verify bằng Drizzle Studio

**→ Chuyển sang [Phase 2: Chunking](./phase-2-chunking.md)**
