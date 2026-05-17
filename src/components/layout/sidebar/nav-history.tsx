"use client"

import { useEffect } from "react"
import {
  MoreHorizontal,
  Trash2,
  MessageSquare,
  Share,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useChatStore } from "@/store/chat-store"
import { toast } from "sonner"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavHistory() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { setSessionId, setMessages, currentSessionId } = useChatStore()

  // 1. Fetch chat sessions
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/chats")
      if (!res.ok) throw new Error("Failed to fetch chat history")
      return res.json()
    }
  })

  // 2. Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/chats/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete chat")
      return res.json()
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] })
      if (currentSessionId === deletedId) {
        setSessionId(null)
        setMessages([])
        router.push("/")
      }
      toast.success("Chat deleted")
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  // 3. Load chat messages when clicking a session
  const loadChat = async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`)
      if (!res.ok) throw new Error("Failed to load chat")
      const data = await res.json()
      
      setSessionId(id)
      setMessages(data.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content
      })))
      
      router.push(`/?id=${id}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // 4. Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string, title: string }) => {
      const res = await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      })
      if (!res.ok) throw new Error("Failed to rename chat")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] })
      toast.success("Chat renamed")
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  const handleRename = (id: string, currentTitle: string) => {
    const newTitle = window.prompt("Enter new chat title:", currentTitle)
    if (newTitle && newTitle.trim() !== currentTitle) {
      renameMutation.mutate({ id, title: newTitle.trim() })
    }
  }

  if (isLoading && history.length === 0) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Chat History</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-4 py-2 text-xs text-muted-foreground">Loading history...</div>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Chat History</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {history.length === 0 ? (
            <div className="px-4 py-2 text-xs text-muted-foreground italic">No conversations found</div>
          ) : (
            history.map((item: any) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton 
                  onClick={() => loadChat(item.id)}
                  isActive={currentSessionId === item.id}
                  className="group/btn"
                >
                  <MessageSquare className="size-4 shrink-0 opacity-70 group-active/btn:opacity-100" />
                  <span className="truncate flex-1">{item.title || "Untitled Chat"}</span>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover className="data-[state=open]:bg-sidebar-accent">
                      <MoreHorizontal />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem onClick={() => handleRename(item.id, item.title)}>
                      <Share className="text-muted-foreground size-4 mr-2" />
                      <span>Rename</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4 mr-2" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
