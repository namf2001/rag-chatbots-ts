import { ChatWindow } from "@/components/chat/chat-window";

export const metadata = {
  title: "Chat | RAG Chatbot",
  description: "AI-powered chatbot with Retrieval-Augmented Generation using Ollama",
};

// Home renders the full-screen chat layout.
export default function Home() {
  return <ChatWindow />;
}
