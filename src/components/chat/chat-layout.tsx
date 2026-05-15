"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Bot, Database } from "lucide-react";
import { FileUploader } from "@/components/documents/file-uploader";
import { DocumentList } from "@/components/documents/document-list";
import { ChatWindow } from "@/components/chat/chat-window";

import { NavUser } from "@/components/chat/nav-user";

const DUMMY_USER = {
  name: "User",
  email: "user@example.com",
  avatar: "",
};

// AppSidebar renders the navigation sidebar with document management.
function AppSidebar() {
  return (
    <Sidebar className="border-r">
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Bot className="size-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">RAG Chatbot</p>
            <p className="text-[11px] text-muted-foreground">Powered by Ollama</p>
          </div>
        </div>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        {/* Upload section */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            <Database className="size-3.5" />
            Knowledge Base
          </SidebarGroupLabel>
          <div className="px-2">
            <FileUploader />
          </div>
        </SidebarGroup>

        <Separator className="mx-4" />

        {/* Document list */}
        <SidebarGroup>
          <SidebarGroupLabel>Ingested Documents</SidebarGroupLabel>
          <div className="px-2">
            <DocumentList />
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 py-2">
        <NavUser user={DUMMY_USER} />
      </SidebarFooter>
    </Sidebar>
  );
}

// ChatLayout wraps the entire app with shadcn SidebarProvider and renders sidebar + chat area.
export function ChatLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile sidebar toggle */}
          <div className="flex items-center gap-2 px-4 py-2 border-b md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-medium">RAG Chatbot</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatWindow />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
