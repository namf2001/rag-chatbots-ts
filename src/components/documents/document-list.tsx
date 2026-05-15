"use client";

import { FileText, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocuments, useDeleteDocument } from "@/hooks/use-documents";
import { Separator } from "@/components/ui/separator";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

// DocumentList displays all ingested documents with delete functionality using TanStack Query.
export function DocumentList() {
  const { data: documents, isLoading } = useDocuments();
  const { mutate: deleteDoc, isPending } = useDeleteDocument();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <FileText className="size-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No documents yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[300px]">
      <div className="flex flex-col gap-1">
        {documents.map((doc, i) => (
          <div key={doc.id}>
            <div className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-muted/50 group transition-colors">
              <FileText className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{doc.filename}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                    {doc.fileType.toUpperCase()}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatBytes(doc.fileSize)} · {doc.chunksCount} chunks
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
                disabled={isPending}
                onClick={() => deleteDoc(doc.id)}
              >
                {isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Trash2 className="size-3" />
                )}
              </Button>
            </div>
            {i < documents.length - 1 && <Separator className="my-0.5" />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
