import { NextResponse } from "next/server";
import {
  addDocument,
  getCohortById,
  listDocumentsForCohort,
  savePdfToDisk,
  saveSearchTextFile,
  updateDocumentSearchFields,
} from "@/lib/store";
import { extractPdfTextForSearch, MIN_MEANINGFUL_CHARS } from "@/lib/extractPdfText";
import type { DocumentKind, StoredDocument, TermKind } from "@/lib/types";

const MAX_BYTES = 25 * 1024 * 1024;

function parseKind(v: FormDataEntryValue | null): DocumentKind | null {
  const s = String(v ?? "");
  if (s === "handbook" || s === "syllabus" || s === "transcript") return s;
  return null;
}

function parseTerm(v: FormDataEntryValue | null): TermKind | undefined {
  const s = String(v ?? "");
  if (s === "zenki" || s === "kouki" || s === "tsuunen" || s === "other") return s;
  return undefined;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ cohortId: string }> }
) {
  const { cohortId } = await ctx.params;
  const cohort = await getCohortById(cohortId);
  if (!cohort) {
    return NextResponse.json({ error: "コホートが見つかりません" }, { status: 404 });
  }
  const documents = await listDocumentsForCohort(cohortId);
  return NextResponse.json({ documents });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ cohortId: string }> }
) {
  const { cohortId } = await ctx.params;
  const cohort = await getCohortById(cohortId);
  if (!cohort) {
    return NextResponse.json({ error: "コホートが見つかりません" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDFファイルを選択してください" }, { status: 400 });
  }

  const lower = file.name.toLowerCase();
  const mime = file.type;
  if (!lower.endsWith(".pdf") && mime !== "application/pdf") {
    return NextResponse.json({ error: "PDFのみアップロードできます" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0 || buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "ファイルサイズが不正です（上限25MB）" }, { status: 400 });
  }

  const kind = parseKind(form.get("kind"));
  if (!kind) {
    return NextResponse.json({ error: "種別を指定してください" }, { status: 400 });
  }

  let courseCode = String(form.get("courseCode") ?? "").trim() || undefined;
  let courseTitle = String(form.get("courseTitle") ?? "").trim() || undefined;
  let termTag = parseTerm(form.get("termTag"));
  if (kind === "transcript") {
    termTag = undefined;
    courseCode = undefined;
  }

  if (kind === "syllabus" && !courseTitle && !courseCode) {
    return NextResponse.json(
      { error: "シラバスは科目名または科目コードのどちらかを入力してください" },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  const storedFileName = await savePdfToDisk(cohortId, id, buf);

  const doc: StoredDocument = {
    id,
    cohortId,
    kind,
    storedFileName,
    originalFileName: file.name,
    courseCode,
    courseTitle,
    termTag,
    uploadedAt: new Date().toISOString(),
    searchTextReady: false,
  };

  await addDocument(doc);

  try {
    const text = await extractPdfTextForSearch(buf);
    if (text.length < MIN_MEANINGFUL_CHARS) {
      await updateDocumentSearchFields(id, {
        searchTextReady: false,
        searchTextError:
          "テキストがほとんど取り出せませんでした（スキャンPDF・保護PDF・特殊フォントの可能性があります）",
      });
    } else {
      await saveSearchTextFile(id, text);
      await updateDocumentSearchFields(id, {
        searchTextReady: true,
        searchTextError: undefined,
      });
      doc.searchTextReady = true;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "抽出に失敗しました";
    await updateDocumentSearchFields(id, {
      searchTextReady: false,
      searchTextError: msg,
    });
    doc.searchTextReady = false;
    doc.searchTextError = msg;
  }

  const refreshed = (await listDocumentsForCohort(cohortId)).find((d) => d.id === id) ?? doc;
  return NextResponse.json({ document: refreshed });
}
