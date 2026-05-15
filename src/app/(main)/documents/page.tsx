import { FileUploader } from "@/components/documents/file-uploader";
import { DocumentList } from "@/components/documents/document-list";

export const metadata = {
  title: "Documents | RAG Chatbot",
  description: "Manage knowledge base documents",
};

export default function DocumentsPage() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4 text-foreground/90">Upload Document</h2>
          <FileUploader />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4 text-foreground/90">Ingested Documents</h2>
          <DocumentList />
        </section>
      </div>
    </div>
  );
}
