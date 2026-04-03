import { NextResponse } from "next/server";
import { cohortDocumentSearch } from "@/lib/cohortSearch";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ cohortId: string }> }
) {
  const { cohortId } = await ctx.params;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  const result = await cohortDocumentSearch(cohortId, q);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    query: result.query,
    hitCount: result.hitCount,
    skippedDocumentCount: result.skippedDocumentCount,
    hits: result.hits,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ cohortId: string }> }
) {
  const { cohortId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON が不正です" }, { status: 400 });
  }
  const q =
    typeof body === "object" && body !== null && "q" in body
      ? String((body as { q: unknown }).q ?? "")
      : "";

  const result = await cohortDocumentSearch(cohortId, q);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    query: result.query,
    hitCount: result.hitCount,
    skippedDocumentCount: result.skippedDocumentCount,
    hits: result.hits,
  });
}
