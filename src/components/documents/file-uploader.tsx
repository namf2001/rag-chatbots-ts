"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUploadDocument } from "@/hooks/use-documents";

// FileUploader provides a drag-and-drop zone to upload documents to the ingest API.
export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { mutate: upload, isPending } = useUploadDocument();

  const ACCEPTED = [".pdf", ".txt", ".md", ".docx", ".csv", ".xlsx"];

  const handleFile = (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      alert(`Unsupported file type. Accepted: ${ACCEPTED.join(", ")}`);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleSubmit = () => {
    if (!selectedFile) return;
    upload(selectedFile, {
      onSuccess: () => setSelectedFile(null),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          className="hidden"
          accept={ACCEPTED.join(",")}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Upload className="size-5 mx-auto mb-1 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Drop file or click to browse
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          PDF, TXT, MD, DOCX, CSV, XLSX
        </p>
      </div>

      {/* Selected file preview */}
      {selectedFile && (
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs">
          <FileText className="size-3.5 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate">{selectedFile.name}</span>
          <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Upload button */}
      <Button
        size="sm"
        className="w-full"
        disabled={!selectedFile || isPending}
        onClick={handleSubmit}
      >
        {isPending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
            Ingesting…
          </>
        ) : (
          <>
            <Upload className="size-3.5" data-icon="inline-start" />
            Ingest Document
          </>
        )}
      </Button>
    </div>
  );
}
