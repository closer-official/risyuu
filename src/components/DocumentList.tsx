"use client";

import { useState } from "react";
import type { StoredDocument } from "@/lib/types";

function termLabel(t?: string) {
  switch (t) {
    case "zenki":
      return "前期";
    case "kouki":
      return "後期";
    case "tsuunen":
      return "通年";
    case "other":
      return "その他";
    default:
      return "";
  }
}

function ReindexButton({
  cohortId,
  docId,
  onDone,
}: {
  cohortId: string;
  docId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/documents/${docId}/reindex`, {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg(j.error ?? "失敗");
        return;
      }
      onDone();
    } catch {
      setMsg("通信エラー");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        className="rounded-md border border-zinc-400 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-500 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {busy ? "再抽出中…" : "検索用テキスト再抽出"}
      </button>
      {msg && <span className="text-xs text-red-600 dark:text-red-400">{msg}</span>}
    </span>
  );
}

export function DocumentList({
  title,
  documents,
  emptyText,
  cohortId,
  onDocumentsChange,
}: {
  title: string;
  documents: StoredDocument[];
  emptyText: string;
  /** 指定時、各行に「検索用テキスト再抽出」ボタンを表示 */
  cohortId?: string;
  onDocumentsChange?: () => void;
}) {
  if (documents.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-600 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-700">
        {documents.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {d.kind === "syllabus"
                  ? [d.courseCode, d.courseTitle].filter(Boolean).join(" ") || d.originalFileName
                  : d.kind === "transcript"
                    ? d.courseTitle
                      ? `${d.courseTitle}（${d.originalFileName}）`
                      : d.originalFileName
                    : d.originalFileName}
              </p>
              <p className="text-xs text-zinc-500">
                {d.searchTextReady === true && <span className="mr-2">全文検索可</span>}
                {d.searchTextError && (
                  <span className="mr-2 text-amber-800 dark:text-amber-200">
                    検索未対応（{d.searchTextError}）
                  </span>
                )}
                {[termLabel(d.termTag)].filter(Boolean).join(" ")}
                {d.uploadedAt ? ` · ${new Date(d.uploadedAt).toLocaleString("ja-JP")}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {cohortId && onDocumentsChange && (
                <ReindexButton cohortId={cohortId} docId={d.id} onDone={onDocumentsChange} />
              )}
              <a
                href={`/api/documents/${d.id}/file`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                開く
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
