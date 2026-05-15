import { NextRequest, NextResponse } from "next/server";
import { askRAG } from "@/lib/langchain/chain";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter: ?q=your+question" },
      { status: 400 }
    );
  }

  try {
    console.log(`[TestRAG] Received query: "${query}"`);
    const start = performance.now();

    const result = await askRAG(query);

    const elapsed = (performance.now() - start).toFixed(0);
    console.log(`[TestRAG] Answered in ${elapsed}ms`);

    return NextResponse.json({
      query,
      answer: result.answer,
      executionTimeMs: `${elapsed}ms`,
      sourcesCount: result.sources.length,
      sources: result.sources.map((s) => ({
        content: s.content.slice(0, 200) + (s.content.length > 200 ? "..." : ""),
        similarity: s.similarity.toFixed(4),
        metadata: s.metadata,
      })),
    });
  } catch (error: any) {
    console.error("[TestRAG] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
