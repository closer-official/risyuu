import {
  getCohortById,
  listDocumentsForCohort,
  readSearchTextFile,
} from "@/lib/store";
import type { DocumentKind } from "@/lib/types";

const MAX_HITS = 40;
const SNIPPET_RADIUS = 100;
/** 複数語を近接させて切り出すときの探索幅 */
const NEAR_RADIUS = 420;
/** 最終的な抜粋の最大文字数（1行潰しPDF対策） */
const MAX_SNIPPET_CHARS = 380;

export type CohortSearchHit = {
  documentId: string;
  kind: DocumentKind;
  kindLabel: string;
  title: string;
  snippets: string[];
  /** 抜粋内の「数字+単位」などを正規表現で拾ったもの（推論ではない） */
  patternHints?: string[];
};

function kindLabel(kind: DocumentKind) {
  switch (kind) {
    case "handbook":
      return "学生要覧";
    case "syllabus":
      return "シラバス";
    case "transcript":
      return "成績表";
    default:
      return kind;
  }
}

function docDisplayName(d: {
  kind: DocumentKind;
  originalFileName: string;
  courseCode?: string;
  courseTitle?: string;
}) {
  if (d.kind === "syllabus") {
    return [d.courseCode, d.courseTitle].filter(Boolean).join(" ") || d.originalFileName;
  }
  if (d.kind === "transcript") {
    return d.courseTitle ? `${d.courseTitle}（${d.originalFileName}）` : d.originalFileName;
  }
  return d.originalFileName;
}

/** クエリ語と PDF テキストのゆるい一致（例: 単位数 ↔ 2.0単位） */
function termMatchesInText(lower: string, term: string): boolean {
  if (term.length >= 2 && lower.includes(term)) return true;
  if (term === "単位数" && lower.includes("単位")) return true;
  return false;
}

function matchesAllTermsFlexible(lower: string, terms: string[]) {
  return terms.every((t) => termMatchesInText(lower, t));
}

function findTermInSlice(lower: string, from: number, to: number, term: string): { s: number; e: number } | null {
  const slice = lower.slice(from, to);
  let idx = slice.indexOf(term);
  let len = term.length;
  if (idx === -1 && term === "単位数") {
    idx = slice.indexOf("単位");
    len = "単位".length;
  }
  if (idx === -1) return null;
  const s = from + idx;
  return { s, e: s + len };
}

/**
 * 最長語の出現位置ごとに近傍を見て、他語も含む最も狭い窓を選ぶ。
 */
function findTightWindowBounds(
  lower: string,
  terms: string[]
): { start: number; end: number } | null {
  if (terms.length === 0) return null;

  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const primary = sorted[0]!;
  const others = sorted.slice(1);

  const primaryOcc: number[] = [];
  let pos = 0;
  while (primaryOcc.length < 12) {
    const i = lower.indexOf(primary, pos);
    if (i === -1) break;
    primaryOcc.push(i);
    pos = i + Math.max(1, primary.length >> 1);
  }

  if (primaryOcc.length === 0) {
    for (const t of sorted) {
      const j = lower.indexOf(t);
      if (j !== -1) {
        return { start: Math.max(0, j - 120), end: Math.min(lower.length, j + t.length + 120) };
      }
      if (t === "単位数") {
        const k = lower.indexOf("単位");
        if (k !== -1) return { start: Math.max(0, k - 120), end: Math.min(lower.length, k + 80) };
      }
    }
    return null;
  }

  if (others.length === 0) {
    const i = primaryOcc[0]!;
    return {
      start: Math.max(0, i - 130),
      end: Math.min(lower.length, i + primary.length + 130),
    };
  }

  let bestSpan = Infinity;
  let best: { start: number; end: number } | null = null;

  for (const pi of primaryOcc) {
    const pEnd = pi + primary.length;
    const w0 = Math.max(0, pi - NEAR_RADIUS);
    const w1 = Math.min(lower.length, pEnd + NEAR_RADIUS);

    const occs: { s: number; e: number }[] = [{ s: pi, e: pEnd }];
    let ok = true;
    for (const o of others) {
      const hit = findTermInSlice(lower, w0, w1, o);
      if (!hit) {
        ok = false;
        break;
      }
      occs.push(hit);
    }
    if (!ok) continue;

    const start = Math.min(...occs.map((x) => x.s));
    const end = Math.max(...occs.map((x) => x.e));
    const span = end - start;
    if (span < bestSpan) {
      bestSpan = span;
      best = { start, end };
    }
  }

  if (!best) {
    const i = primaryOcc[0]!;
    return {
      start: Math.max(0, i - 130),
      end: Math.min(lower.length, i + primary.length + 130),
    };
  }

  const pad = 48;
  return {
    start: Math.max(0, best.start - pad),
    end: Math.min(lower.length, best.end + pad),
  };
}

/** シラバスっぽい連結テキストを読みやすく粗く改行 */
function softBreakReadability(s: string): string {
  let t = s.replace(/\s+/g, " ").trim();
  const labels =
    "(単位数|開講年度|学期|曜日|時限|担当教員|授業形態|評価方法|評価基準|教科書名|参考書名|目的概要|達成目標|関連科目|履修条件|英文名|教室)";
  t = t.replace(new RegExp(`\\s*${labels}`, "g"), "\n$1");
  t = t.replace(/(第\d+回)(?=[^\n])/g, "\n$1");
  t = t.replace(/(【[^】]+】)/g, "\n$1");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

function truncateSnippet(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

/** 「2.0単位」など表記を拾う（推論なし） */
function extractUnitPatternsInSlice(slice: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /(\d+(?:\.\d+)?)\s*単位/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice)) !== null && out.length < 6) {
    const key = m[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function buildSnippetsSmart(
  text: string,
  lower: string,
  usePhrase: boolean,
  phrase: string,
  terms: string[]
): { snippets: string[]; patternHints: string[] } {
  let start = 0;
  let end = text.length;

  const phraseHit = usePhrase && phrase.length >= 2 && lower.includes(phrase);
  if (phraseHit) {
    const idx = lower.indexOf(phrase);
    start = Math.max(0, idx - SNIPPET_RADIUS);
    end = Math.min(text.length, idx + phrase.length + SNIPPET_RADIUS);
  } else if (terms.length >= 2 && matchesAllTermsFlexible(lower, terms)) {
    const b = findTightWindowBounds(lower, terms);
    if (b) {
      start = b.start;
      end = b.end;
    }
  } else if (terms.length === 1) {
    const t = terms[0]!;
    const needle = t === "単位数" && !lower.includes("単位数") ? "単位" : t;
    const idx = lower.indexOf(needle);
    if (idx !== -1) {
      const len = needle.length;
      start = Math.max(0, idx - 130);
      end = Math.min(text.length, idx + len + 130);
    }
  }

  let slice = text.slice(start, end).replace(/\s+/g, " ");
  if (start > 0) slice = "…" + slice;
  if (end < text.length) slice = slice + "…";

  const patternHints = extractUnitPatternsInSlice(slice);
  const formatted = softBreakReadability(slice);
  const main = truncateSnippet(formatted, MAX_SNIPPET_CHARS);

  return { snippets: [main], patternHints };
}

/** 先頭・末尾の助詞っぽい1〜2文字を繰り返し除去（「評価基準は」→「評価基準」） */
function stripEdgeParticles(s: string): string {
  const edge =
    /^(?:は|を|に|が|も|や|へ|で|と|から|まで|など|より|だけ|ばかり|て|にて|って)+|(?:は|を|に|が|も|や|へ|で|と|から|まで|など|か|ね|よ|って|わ)+$/u;
  let t = s.trim();
  for (let i = 0; i < 12; i++) {
    const next = t.replace(edge, "").trim();
    if (next === t) break;
    t = next;
  }
  return t;
}

/**
 * 日本語の口語クエリを AND 用の語にばらす。
 * - 半角・全角スペース区切りはそのまま（明示 AND）
 * - それ以外は「の」で切り、各片から端の助詞を落とす
 */
export function expandSearchTerms(raw: string): string[] {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\u3000/g, " ")
    .replace(/[？?。．!！]+$/g, "")
    .trim();

  if (normalized.length < 2) return [];

  const spaceChunks = normalized.split(/\s+/).filter(Boolean);
  const pieces: string[] = [];

  for (const chunk of spaceChunks) {
    const byNo = chunk.split(/の+/u).map(stripEdgeParticles).map((x) => x.trim()).filter(Boolean);
    if (byNo.length >= 2) {
      pieces.push(...byNo);
    } else {
      const one = stripEdgeParticles(chunk);
      if (one.length >= 2) pieces.push(one);
    }
  }

  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const p of pieces) {
    if (p.length < 2) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    uniq.push(p);
  }
  return uniq.slice(0, 12);
}

export type CohortSearchOk = {
  ok: true;
  query: string;
  hitCount: number;
  skippedDocumentCount: number;
  hits: CohortSearchHit[];
};

export type CohortSearchErr = {
  ok: false;
  status: number;
  error: string;
};

/**
 * 同一コホート内の PDF から抽出済みテキストだけを対象にキーワード検索（AI 不使用）。
 */
export async function cohortDocumentSearch(
  cohortId: string,
  qRaw: string
): Promise<CohortSearchOk | CohortSearchErr> {
  const cohort = await getCohortById(cohortId);
  if (!cohort) {
    return { ok: false, status: 404, error: "コホートが見つかりません" };
  }

  const q = qRaw.trim();
  if (q.length < 2) {
    return { ok: false, status: 400, error: "キーワードは2文字以上で入力してください" };
  }

  const normalizedPhrase = q
    .trim()
    .toLowerCase()
    .replace(/\u3000/g, " ")
    .replace(/[？?。．!！]+$/g, "")
    .trim();

  let terms = expandSearchTerms(q);
  if (terms.length === 0 && normalizedPhrase.length >= 2) {
    terms = [normalizedPhrase];
  }
  if (terms.length === 0) {
    return { ok: false, status: 400, error: "キーワードが不正です" };
  }

  const documents = await listDocumentsForCohort(cohortId);
  const indexed = documents.filter((d) => d.searchTextReady);

  const hits: CohortSearchHit[] = [];
  const phrase = normalizedPhrase;

  for (const d of indexed) {
    if (hits.length >= MAX_HITS) break;
    const text = await readSearchTextFile(d.id);
    if (!text) continue;
    const lower = text.toLowerCase();

    const usePhrase = phrase.length >= 2 && lower.includes(phrase);
    const useAllTerms = matchesAllTermsFlexible(lower, terms);
    if (!usePhrase && !useAllTerms) continue;

    const { snippets, patternHints } = buildSnippetsSmart(text, lower, usePhrase, phrase, terms);
    hits.push({
      documentId: d.id,
      kind: d.kind,
      kindLabel: kindLabel(d.kind),
      title: docDisplayName(d),
      snippets: snippets.length > 0 ? snippets : ["（該当箇所の抜粋を作れませんでした）"],
      patternHints: patternHints.length > 0 ? patternHints : undefined,
    });
  }

  const skipped = documents.filter((d) => !d.searchTextReady).length;

  return {
    ok: true,
    query: q,
    hitCount: hits.length,
    skippedDocumentCount: skipped,
    hits,
  };
}
