"use client";

import { useEffect, useRef, useState } from "react";

type Hit = {
  documentId: string;
  kindLabel: string;
  title: string;
  snippets: string[];
  patternHints?: string[];
};

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      hits: Hit[];
      skippedDocumentCount: number;
      hitCount: number;
    };

export function DataOnlyChatPanel({ cohortId }: { cohortId: string }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch(`/api/cohorts/${cohortId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text }),
      });
      const j = await res.json();

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: j.error ?? "検索に失敗しました。",
            hits: [],
            skippedDocumentCount: 0,
            hitCount: 0,
          },
        ]);
        return;
      }

      const hits = (j.hits ?? []) as Hit[];
      const skipped = typeof j.skippedDocumentCount === "number" ? j.skippedDocumentCount : 0;
      const hitCount = typeof j.hitCount === "number" ? j.hitCount : hits.length;

      let intro: string;
      if (hitCount === 0) {
        intro =
          "このコホートにアップロード済みの PDF から取り出したテキストの範囲では、該当箇所は見つかりませんでした。別のキーワード・スペース区切りの複合語（すべて含む AND）を試すか、対象 PDF が「全文検索可」になっているか確認してください。";
      } else {
        intro = `アップロード済み PDF の抽出テキストから、次の ${hitCount} 件が該当しました（推論や要約はしていません。抜粋の羅列です）。`;
      }

      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: intro,
          hits,
          skippedDocumentCount: skipped,
          hitCount,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "通信エラーが発生しました。",
          hits: [],
          skippedDocumentCount: 0,
          hitCount: 0,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex max-h-[min(70vh,640px)] flex-col rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          データ照会チャット（非AI）
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          送信した文を検索に使います。日本語の自然文は「の」や文末の「は」などを除いて複数語に分け、
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">
            すべての語が PDF 抽出テキストに含まれる行
          </strong>
          を探します（AND）。スペース区切りの明示 AND も使えます。外部データ・生成AIは使いません。会話の文脈は引き継ぎません。
        </p>
      </div>

      <div className="min-h-[200px] flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            例：「数値解析学の評価基準は？」「必修」「単位 卒業」。スペースは明示 AND です。
          </p>
        )}
        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start">
              <div className="max-w-[95%] space-y-3 rounded-2xl rounded-bl-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200">
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.skippedDocumentCount > 0 && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    テキスト未索引の PDF が {msg.skippedDocumentCount}{" "}
                    件あります（検索対象に含まれていません）。
                  </p>
                )}
                {msg.hits.length > 0 && (
                  <ul className="space-y-4 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                    {msg.hits.map((h) => (
                      <li key={h.documentId}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            <span className="mr-2 rounded bg-white px-1.5 py-0.5 text-xs font-normal text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-600">
                              {h.kindLabel}
                            </span>
                            {h.title}
                          </p>
                          <a
                            href={`/api/documents/${h.documentId}/file`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
                          >
                            PDF を開く
                          </a>
                        </div>
                        {h.patternHints && h.patternHints.length > 0 && (
                          <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                            抜粋内の「数字＋単位」表記（正規表現・非推論）:{" "}
                            {h.patternHints.join(" · ")}
                          </p>
                        )}
                        <ul className="mt-2 space-y-1">
                          {h.snippets.map((s, i) => (
                            <li
                              key={i}
                              className="whitespace-pre-wrap rounded-md bg-white px-2 py-1 font-mono text-xs leading-relaxed text-zinc-700 ring-1 ring-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800"
                            >
                              {s}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-950">
              検索中…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="flex flex-col gap-2 border-t border-zinc-200 p-4 dark:border-zinc-700 sm:flex-row sm:items-end"
      >
        <label className="min-w-0 flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          メッセージ（検索語）
          <textarea
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="抽出テキスト内を探す語句を入力"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          送信
        </button>
      </form>
    </section>
  );
}
