import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatSessions } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chats = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, session.user.id))
      .orderBy(desc(chatSessions.createdAt));

    return NextResponse.json(chats);
  } catch (error) {
    console.error("Failed to fetch chats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title } = await req.json();
    
    const [newChat] = await db
      .insert(chatSessions)
      .values({
        userId: session.user.id,
        title: title || "New Chat",
      })
      .returning();

    return NextResponse.json(newChat);
  } catch (error) {
    console.error("Failed to create chat:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
