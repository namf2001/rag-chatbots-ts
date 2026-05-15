"use client"

import * as React from "react"
import { Bot, Database, MessageSquare } from "lucide-react"

import { NavMain } from "@/components/layout/sidebar/nav-main"
import { NavHistory } from "@/components/layout/sidebar/nav-history"
import { NavUser } from "@/components/layout/sidebar/nav-user"
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
      title: "Chat",
      url: "/",
      icon: MessageSquare,
    },
    {
      title: "Knowledge Base",
      url: "/documents",
      icon: Database,
    },
  ],
  history: [
    { name: "Tóm tắt tài liệu hệ thống", url: "#", icon: MessageSquare },
    { name: "Phân tích báo cáo tài chính", url: "#", icon: MessageSquare },
    { name: "So sánh hợp đồng mẫu", url: "#", icon: MessageSquare },
    { name: "Giải thích pipeline RAG", url: "#", icon: MessageSquare },
    { name: "Hướng dẫn cài đặt Drizzle", url: "#", icon: MessageSquare },
    { name: "So sánh React và Vue", url: "#", icon: MessageSquare },
    { name: "Tối ưu hóa vector search", url: "#", icon: MessageSquare },
    { name: "Tài liệu API Auth", url: "#", icon: MessageSquare },
    { name: "Hướng dẫn deploy Vercel", url: "#", icon: MessageSquare },
    { name: "Các chỉ số KPI dự án", url: "#", icon: MessageSquare },
    { name: "Lên plan Marketing tháng 5", url: "#", icon: MessageSquare },
    { name: "Code review: Chat component", url: "#", icon: MessageSquare },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavMain items={data.navMain} />
        <NavHistory history={data.history} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
