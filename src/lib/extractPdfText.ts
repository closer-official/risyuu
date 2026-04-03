import { PDFParse } from "pdf-parse";
import pdfParseLegacy from "pdf-parse-legacy";

const MAX_SEARCH_TEXT_CHARS = 1_500_000;
const MIN_MEANINGFUL_CHARS = 4;

function normalizeExtracted(raw: string): string {
  const s = raw.replace(/\0/g, "").replace(/\r\n/g, "\n").trim();
  if (s.length > MAX_SEARCH_TEXT_CHARS) return s.slice(0, MAX_SEARCH_TEXT_CHARS);
  return s;
}

async function extractWithV2(buffer: Buffer): Promise<string> {
  const copy = Buffer.from(buffer);
  const data = new Uint8Array(copy.length);
  copy.copy(data);
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText({ lineEnforce: true });
    let raw = (result.text ?? "").trim();
    if (raw.length < MIN_MEANINGFUL_CHARS && result.pages?.length) {
      raw = result.pages.map((p) => p.text ?? "").join("\n\n");
    }
    return normalizeExtracted(raw);
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractWithLegacy(buffer: Buffer): Promise<string> {
  const copy = Buffer.from(buffer);
  const result = await pdfParseLegacy(copy);
  return normalizeExtracted(result.text ?? "");
}

/**
 * PDF からプレーンテキストを取り出す（AI 不使用。検索用）。
 * pdf-parse v2 と v1 の両方を試し、長い方を採用する。
 */
export async function extractPdfTextForSearch(buffer: Buffer): Promise<string> {
  const buf = Buffer.from(buffer);

  let best = "";
  try {
    best = await extractWithV2(buf);
  } catch {
    /* v1 に任せる */
  }

  if (best.length < MIN_MEANINGFUL_CHARS) {
    try {
      const legacy = await extractWithLegacy(buf);
      if (legacy.length > best.length) best = legacy;
    } catch {
      /* 呼び出し側で扱う */
    }
  }

  return best;
}

export { MIN_MEANINGFUL_CHARS };
