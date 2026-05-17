import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatSessions, chatMessages } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth";
import { createRAGChain } from "@/lib/langchain/chain";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messages, sessionId } = body;

    if (!messages || messages.length === 0) {
      return Response.json({ error: "No messages provided" }, { status: 400 });
    }

    if (!sessionId) {
      return Response.json({ error: "Session ID is required" }, { status: 400 });
    }

    // 1. Verify session ownership
    const chatSession = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, session.user.id)
      ),
    });

    if (!chatSession) {
      return Response.json({ error: "Chat session not found" }, { status: 404 });
    }

    // 2. Save User Message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") {
      return Response.json({ error: "Invalid message flow" }, { status: 400 });
    }

    await db.insert(chatMessages).values({
      sessionId: sessionId,
      role: "user",
      content: lastMessage.content,
    });

    // 3. Stream from LangChain
    const chain = await createRAGChain();
    const stream = await chain.stream(lastMessage.content);

    const encoder = new TextEncoder();
    let assistantContent = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk) {
              assistantContent += chunk;
              controller.enqueue(encoder.encode(chunk));
            }
          }
          
          // 4. Save Assistant Message once stream is done
          if (assistantContent) {
            await db.insert(chatMessages).values({
              sessionId: sessionId,
              role: "assistant",
              content: assistantContent,
            });
          }
        } catch (err) {
          console.error("[Chat] Stream error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("[Chat] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}