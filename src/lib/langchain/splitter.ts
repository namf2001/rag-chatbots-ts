import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

// createSplitter initializes the text splitter with configurations.
// Default chunk size is 1000 characters, with an overlap of 200 characters.
export function createSplitter(chunkSize = 1000, chunkOverlap = 200) {
  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", ".", " ", ""],
  });
}

// splitDocuments splits an array of documents into smaller chunks.
export async function splitDocuments(docs: Document[]): Promise<Document[]> {
  const splitter = createSplitter();
  const chunks = await splitter.splitDocuments(docs);

  // Enrich metadata with chunk indexing to keep track of the order
  return chunks.map((chunk, index) => {
    return new Document({
      pageContent: chunk.pageContent,
      metadata: {
        ...chunk.metadata,
        chunkIndex: index,
      },
    });
  });
}
