import { ChatLayout } from "@/components/chat/chat-layout";

export const metadata = {
  title: "RAG Chatbot",
  description: "AI-powered chatbot with Retrieval-Augmented Generation using Ollama",
};

// Home renders the full-screen chat layout.
export default function Home() {
  return <ChatLayout />;
}
