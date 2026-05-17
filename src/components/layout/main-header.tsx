"use client";

import { usePathname } from "next/navigation";
import { Database, Sparkles, Trash2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useChatStream } from "@/hooks/use-chat-stream";

export function MainHeader() {
  const pathname = usePathname();
  const { messages, isLoading, clearMessages } = useChatStream();
  
  const isDocsPage = pathname === "/documents";
  const isChatPage = pathname === "/" || pathname === "";
  const isEmpty = messages.length === 0;

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/80 backdrop-blur-md transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/">RAG Chatbot</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1.5 font-medium">
                {isDocsPage ? (
                  <>
                    <Database className="size-3.5 text-primary" />
                    Knowledge Base
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-primary" />
                    Chat Assistant
                  </>
                )}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2">
        {isChatPage && !isEmpty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-muted-foreground hover:text-foreground h-8 px-3 text-xs transition-colors"
          >
            <Trash2 className="size-3.5 mr-1.5" />
            Clear Chat
          </Button>
        )}
      </div>
    </header>
  );
}
