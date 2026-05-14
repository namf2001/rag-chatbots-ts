import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { Document } from "@langchain/core/documents";
import { readFile } from "fs/promises";
import * as XLSX from "xlsx";
import path from "path";

// loadDocument reads a file and returns an array of LangChain Documents.
export async function loadDocument(filePath: string): Promise<Document[]> {
  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);

  let docs: Document[];

  switch (ext) {
    case ".pdf": {
      const loader = new PDFLoader(filePath);
      docs = await loader.load();
      break;
    }

    case ".csv": {
      const loader = new CSVLoader(filePath);
      docs = await loader.load();
      break;
    }

    case ".docx": {
      const loader = new DocxLoader(filePath);
      docs = await loader.load();
      break;
    }

    case ".xlsx":
    case ".xls": {
      const workbook = XLSX.readFile(filePath);
      docs = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csvString = XLSX.utils.sheet_to_csv(sheet);
        return new Document({
          pageContent: csvString,
          metadata: { source: filePath, sheet: sheetName },
        });
      });
      break;
    }

    case ".txt":
    case ".md": {
      const text = await readFile(filePath, "utf-8");
      docs = [
        new Document({
          pageContent: text,
          metadata: { source: filePath },
        }),
      ];
      break;
    }

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }

  // Enrich metadata cho tất cả docs
  const enrichedDocs = docs.map((doc) => {
    doc.metadata = {
      ...doc.metadata,
      filename,
      fileType: ext.replace(".", ""),
      uploadDate: new Date().toISOString(),
    };
    return doc;
  });

  console.log(`[loadDocument] loaded ${enrichedDocs.length} document(s) from "${filename}"`);
  return enrichedDocs;
}