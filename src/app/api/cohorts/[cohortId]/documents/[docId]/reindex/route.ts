import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import {
  absoluteDocPath,
  getCohortById,
  getDocumentById,
  listDocumentsForCohort,
  saveSearchTextFile,
  updateDocumentSearchFields,
} from "@/lib/store";
import { extractPdfTextForSearch, MIN_MEANINGFUL_CHARS } from "@/lib/extractPdfText";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ cohortId: string; docId: string }> }
) {
  const { cohortId, docId } = await ctx.params;

  const cohort = await getCohortById(cohortId);
  if (!cohort) {
    return NextResponse.json({ error: "コホートが見つかりません" }, { status: 404 });
  }

  const doc = await getDocumentById(docId);
  if (!doc || doc.cohortId !== cohortId) {
    return NextResponse.json({ error: "資料が見つかりません" }, { status: 404 });
  }

  const fullPath = absoluteDocPath(doc.cohortId, doc.storedFileName);
  let buf: Buffer;
  try {
    buf = await fs.readFile(fullPath);
  } catch {
    return NextResponse.json({ error: "PDFファイルを読めません" }, { status: 500 });
  }

  try {
    const text = await extractPdfTextForSearch(buf);
    if (text.length < MIN_MEANINGFUL_CHARS) {
      await updateDocumentSearchFields(docId, {
        searchTextReady: false,
        searchTextError:
          "再索引後もテキストがほとんど取り出せませんでした（スキャンPDF・保護PDFの可能性があります）",
      });
    } else {
      await saveSearchTextFile(docId, text);
      await updateDocumentSearchFields(docId, {
        searchTextReady: true,
        searchTextError: undefined,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "抽出に失敗しました";
    await updateDocumentSearchFields(docId, {
      searchTextReady: false,
      searchTextError: msg,
    });
  }

  const refreshed = (await listDocumentsForCohort(cohortId)).find((d) => d.id === docId);
  return NextResponse.json({ document: refreshed ?? doc });
}
