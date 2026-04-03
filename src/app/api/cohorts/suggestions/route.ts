import { NextResponse } from "next/server";
import { listCohortPlaceTriples } from "@/lib/store";

/** 過去に作成されたコホートの大学・学部・学科の組み合わせ（候補用） */
export async function GET() {
  try {
    const triples = await listCohortPlaceTriples();
    return NextResponse.json({ triples });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
