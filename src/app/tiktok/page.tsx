"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** 空行で段落分け。段落内の単一改行はそのまま折り返し表示 */
function parseParagraphs(raw: string): string[] {
  const parts = raw.split(/\n\s*\n/);
  const out: string[] = [];
  for (const p of parts) {
    const t = p.replace(/^\n+|\n+$/g, "");
    if (t.length > 0) out.push(t);
  }
  return out;
}

function ParaBody({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </>
  );
}

function XIconRow() {
  const iconClass = "h-[18px] w-[18px] text-[#536471]";
  return (
    <div className="mt-3 flex max-w-full items-center justify-between gap-1 text-[13px] text-[#536471]">
      <span className="flex items-center gap-1.5">
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path
            d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 3v-3H6a2 2 0 01-2-2V6z"
            strokeLinejoin="round"
          />
        </svg>
        <span>212</span>
      </span>
      <span className="flex items-center gap-1.5">
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 12a8 8 0 0114.9-4M20 12a8 8 0 01-14.9 4" strokeLinecap="round" />
          <path d="M8 12h8" strokeLinecap="round" />
        </svg>
        <span>719</span>
      </span>
      <span className="flex items-center gap-1.5">
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10z" strokeLinejoin="round" />
        </svg>
        <span>8,459</span>
      </span>
      <span className="flex items-center gap-1.5">
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M6 4v16l6-4 6 4V4H6z" strokeLinejoin="round" />
        </svg>
        <span>373</span>
      </span>
      <span className="flex items-center">
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

export default function TikTokEditorPage() {
  const [bodyText, setBodyText] = useState(
    "最初の段落です。\n改行もこの段落の中に残ります。\n\n2つ目の段落は空行のあとに現れます。\n\n3つ目の段落。"
  );
  const [metaTime, setMetaTime] = useState("20:10");
  const [metaDate, setMetaDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}/${m}/${day}`;
  });
  const [metaViews, setMetaViews] = useState("46万回表示");

  const [playing, setPlaying] = useState(false);
  /** null = 編集プレビュー（全文）。0〜n = 先頭から n 段落だけ表示（再生・途中停止用） */
  const [revealCount, setRevealCount] = useState<number | null>(null);
  const [stepMs, setStepMs] = useState(900);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const paragraphs = useMemo(() => parseParagraphs(bodyText), [bodyText]);

  const stopPlayback = useCallback(() => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    setPlaying(false);
    setRevealCount(null);
  }, []);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const startPlayback = () => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    const paras = parseParagraphs(bodyText);
    if (paras.length === 0) return;
    setPlaying(true);
    setRevealCount(0);

    let shown = 0;
    playTimerRef.current = setInterval(() => {
      shown += 1;
      setRevealCount(shown);
      if (shown >= paras.length) {
        if (playTimerRef.current) {
          clearInterval(playTimerRef.current);
          playTimerRef.current = null;
        }
        setPlaying(false);
        setRevealCount(null);
      }
    }, stepMs);
  };

  const displayParagraphs =
    revealCount === null ? paragraphs : paragraphs.slice(0, revealCount);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 lg:flex-row">
      <section className="flex flex-col border-b border-zinc-800 p-5 lg:w-[min(440px,100%)] lg:border-b-0 lg:border-r">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-white">
            TikTok用 · X風テキスト
          </h1>
          <Link
            href="/"
            className="shrink-0 text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            履修サポートへ
          </Link>
        </div>

        <p className="mb-3 text-xs leading-relaxed text-zinc-500">
          プレーン入力のみ（JSON 不要）。<strong className="text-zinc-400">空行</strong>
          で段落が分かれ、再生時はその単位で下に積み上がります。段落内の改行はそのまま表示されます。
        </p>

        <label className="text-xs font-medium text-zinc-400">本文</label>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          disabled={playing}
          className="mt-1 min-h-[200px] w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 disabled:opacity-50"
          spellCheck={false}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs">
            <span className="text-zinc-500">時刻表記</span>
            <input
              value={metaTime}
              onChange={(e) => setMetaTime(e.target.value)}
              className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="text-zinc-500">日付</span>
            <input
              value={metaDate}
              onChange={(e) => setMetaDate(e.target.value)}
              className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="text-zinc-500">表示回数</span>
            <input
              value={metaViews}
              onChange={(e) => setMetaViews(e.target.value)}
              className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={startPlayback}
            disabled={playing || paragraphs.length === 0}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-40"
          >
            再生（積み上げ）
          </button>
          <button
            type="button"
            onClick={stopPlayback}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200"
          >
            停止 · 全文表示
          </button>
          <label className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
            間隔
            <input
              type="range"
              min={300}
              max={2800}
              step={100}
              value={stepMs}
              onChange={(e) => setStepMs(Number(e.target.value))}
              disabled={playing}
            />
            <span className="w-12 tabular-nums text-zinc-400">{(stepMs / 1000).toFixed(1)}s</span>
          </label>
        </div>

        <p className="mt-3 text-[11px] text-zinc-600">
          画面録画で TikTok 用クリップを作れます。比率 9:16 の黒帯内にカードを配置しています。
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-black p-4 sm:p-8">
        <div
          className="relative flex w-full max-w-[min(100%,calc(min(92vh,100vw-2rem)*9/16))] items-center justify-center bg-black"
          style={{ aspectRatio: "9 / 16" }}
        >
          <div className="flex max-h-[92%] w-[92%] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
            <div className="min-h-[120px] flex-1 overflow-y-auto px-4 pb-2 pt-4">
              {displayParagraphs.length === 0 ? (
                paragraphs.length === 0 ? (
                  <p className="text-[15px] leading-relaxed text-zinc-300">
                    （本文がここに表示されます）
                  </p>
                ) : (
                  <div className="min-h-[56px]" aria-hidden />
                )
              ) : (
                <div className="space-y-3">
                  {displayParagraphs.map((para, i) => {
                    const isLatest =
                      playing &&
                      i === displayParagraphs.length - 1 &&
                      displayParagraphs.length > 0;
                    return (
                      <p
                        key={`${i}-${para.slice(0, 24)}`}
                        className={`text-left text-[15px] leading-relaxed text-[#0f1419] ${
                          isLatest ? "tiktok-para-in" : ""
                        }`}
                      >
                        <ParaBody text={para} />
                      </p>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-zinc-100 px-4 pb-3 pt-2">
              <p className="text-[13px] text-[#536471]">
                {metaTime} · {metaDate} · {metaViews}
              </p>
              <XIconRow />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
