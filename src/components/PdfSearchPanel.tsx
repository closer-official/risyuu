"use client";

import { useState } from "react";

type Hit = {
  documentId: string;
  kindLabel: string;
  title: string;
  snippets: string[];
  patternHints?: string[];
};

export function PdfSearchPanel({ cohortId }: { cohortId: string }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<Hit[]>([]);
  const [skipped, setSkipped] = useState<number | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const query = q.trim();
    if (query.length < 2) {
      setError("2文字以上入力してください");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/cohorts/${cohortId}/search?${new URLSearchParams({ q: query })}`
      );
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "検索に失敗しました");
        setHits([]);
        setSkipped(null);
        return;
      }
      setHits(j.hits as Hit[]);
      setSkipped(typeof j.skippedDocumentCount === "number" ? j.skippedDocumentCount : null);
    } catch {
      setError("通信エラー");
      setHits([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        アップロード済みPDFのキーワード検索
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        AIは使わず、PDFから取り出したテキストに対して文字列マッチを行います。日本語の文は「の」区切り・助詞の除去で複数語 AND
        になります。スキャンPDFは文字が取れず検索できないことがあります。
      </p>
      <form onSubmit={search} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          キーワード（スペース区切りで AND）
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="例: 必修 単位"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "検索中…" : "検索"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {skipped !== null && skipped > 0 && (
        <p className="mt-2 text-xs text-zinc-500">
          テキスト未索引のPDFが {skipped} 件あります（アップロード直後や抽出失敗時）。
        </p>
      )}
      {hits.length > 0 && (
        <ul className="mt-4 space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          {hits.map((h) => (
            <li key={h.documentId}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  <span className="mr-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-normal text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                    {h.kindLabel}
                  </span>
                  {h.title}
                </p>
                <a
                  href={`/api/documents/${h.documentId}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
                >
                  PDFを開く
                </a>
              </div>
              {h.patternHints && h.patternHints.length > 0 && (
                <p className="mt-2 text-xs font-medium text-emerald-900 dark:text-emerald-200">
                  抜粋内の「数字＋単位」表記（正規表現・非推論）: {h.patternHints.join(" · ")}
                </p>
              )}
              <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                {h.snippets.map((s, i) => (
                  <li
                    key={i}
                    className="whitespace-pre-wrap rounded-md bg-zinc-50 px-2 py-1 font-mono text-xs leading-relaxed dark:bg-zinc-950"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
