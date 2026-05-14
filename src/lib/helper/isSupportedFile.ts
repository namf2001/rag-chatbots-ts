import path from "path";

export const SUPPORTED_EXTENSIONS = [".pdf", ".csv", ".docx", ".xlsx", ".xls", ".txt", ".md"];

// isSupportedFile checks if the given filename has a supported extension.
export default function isSupportedFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}