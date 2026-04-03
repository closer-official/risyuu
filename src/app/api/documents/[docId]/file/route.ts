import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { absoluteDocPath, getCohortById, getDocumentById } from "@/lib/store";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ docId: string }> }
) {
  const { docId } = await ctx.params;
  const doc = await getDocumentById(docId);
  if (!doc) {
    return NextResponse.json({ error: "資料が見つかりません" }, { status: 404 });
  }

  const cohort = await getCohortById(doc.cohortId);
  if (!cohort) {
    return NextResponse.json({ error: "コホートが見つかりません" }, { status: 404 });
  }

  const fullPath = absoluteDocPath(doc.cohortId, doc.storedFileName);
  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "ファイルがありません" }, { status: 404 });
    }
    const data = await fs.readFile(fullPath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.originalFileName)}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "ファイルの読み込みに失敗しました" }, { status: 500 });
  }
}
