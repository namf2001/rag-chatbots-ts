"use client"

import * as React from "react"
import { Bot, Database, MessageSquare, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useChatStore } from "@/store/chat-store"

import { NavMain } from "@/components/layout/sidebar/nav-main"
import { NavHistory } from "@/components/layout/sidebar/nav-history"
import { NavUser } from "@/components/layout/sidebar/nav-user"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Chat Assistant",
      url: "/",
      icon: MessageSquare,
    },
    {
      title: "Knowledge Base",
      url: "/documents",
      icon: Database,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const { clearMessages } = useChatStore()

  const handleNewChat = () => {
    clearMessages()
    router.push("/")
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">RAG Chatbot</span>
                <span className="truncate text-xs text-muted-foreground">Powered by Ollama</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-3 py-2 group-data-[collapsible=icon]:hidden">
          <Button 
            onClick={handleNewChat}
            variant="outline" 
            className="w-full justify-start gap-2 shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all border-dashed h-9 px-3"
          >
            <Plus className="size-4" />
            <span className="font-medium text-xs">New Chat</span>
          </Button>
        </div>
        <NavMain items={data.navMain} />
        <NavHistory />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
