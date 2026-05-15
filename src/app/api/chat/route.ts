import { NextRequest } from "next/server";
import { createRAGChain } from "@/lib/langchain/chain";

// POST /api/chat
// Body: { messages: [{ role: "user", content: "..." }] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: { role: string; content: string }[] = body.messages;

    if (!messages || messages.length === 0) {
      return Response.json({ error: "No messages provided" }, { status: 400 });
    }

    // Lấy message cuối cùng của user
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") {
      return Response.json({ error: "Last message must be from user" }, { status: 400 });
    }

    const userQuery = lastMessage.content;
    console.log(`[Chat] User query: "${userQuery}"`);

    // createRAGChain() trả về RunnableSequence
    // .stream() là method có sẵn trên mọi Runnable của LangChain
    const chain = await createRAGChain();
    const stream = await chain.stream(userQuery);

    // Convert LangChain AsyncIterator → Web ReadableStream để trả về HTTP
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // chain của chúng ta dùng StringOutputParser → chunk là string thuần
            if (chunk) {
              controller.enqueue(encoder.encode(chunk));
            }
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
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("[Chat] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}