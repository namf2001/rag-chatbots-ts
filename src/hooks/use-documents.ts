import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Document {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  chunksCount: number;
}

// documentsQueryKey follows factory pattern for cache invalidation.
export const documentsQueryKey = ["documents"] as const;

// useDocuments fetches the list of ingested documents using TanStack Query.
export function useDocuments() {
  return useQuery<Document[]>({
    queryKey: documentsQueryKey,
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      return data.documents;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// useDeleteDocument deletes a document by ID with optimistic cache invalidation.
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsQueryKey });
      toast.success("Document deleted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// useUploadDocument uploads a file to the ingestion API and invalidates documents list.
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/ingest", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: documentsQueryKey });
      toast.success(`Ingested "${data.filename}" → ${data.chunksCreated} chunks`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
