"use client";

import Link from "next/link";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Repeat2,
  Upload,
} from "lucide-react";
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

const iconPx = 18.75;
const iconClass = "shrink-0 text-[#536471]";
const stroke = 1.75;

/** X（Twitter）投稿下部と同系の線アイコン（lucide の標準形状） */
function XIconRow() {
  return (
    <div className="mt-3 flex max-w-full items-center justify-between gap-0.5 text-[13px] text-[#536471]">
      <span className="flex min-w-0 items-center gap-1.5">
        <MessageCircle
          size={iconPx}
          strokeWidth={stroke}
          className={iconClass}
          aria-hidden
        />
        <span className="tabular-nums">212</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <Repeat2 size={iconPx} strokeWidth={stroke} className={iconClass} aria-hidden />
        <span className="tabular-nums">719</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <Heart size={iconPx} strokeWidth={stroke} className={iconClass} aria-hidden />
        <span className="tabular-nums">8,459</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <Bookmark size={iconPx} strokeWidth={stroke} className={iconClass} aria-hidden />
        <span className="tabular-nums">373</span>
      </span>
      <span className="flex min-w-0 items-center">
        <Upload size={iconPx} strokeWidth={stroke} className={iconClass} aria-hidden />
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
    <div className="flex min-h-dvh flex-col bg-black text-zinc-100 lg:min-h-screen lg:flex-row">
      {/* 9:16 録画用キャンバス（スマホは上・横幅いっぱいに近い 9:16） */}
      <section
        className="order-1 flex flex-none justify-center bg-black pt-[max(0.5rem,env(safe-area-inset-top))] lg:order-2 lg:flex-1 lg:items-center lg:py-8"
        aria-label="9:16 プレビュー（画面録画用）"
      >
        <div
          className="relative mx-auto w-[min(100vw,calc(100dvh*9/16))] shrink-0 bg-black lg:mx-auto lg:w-[min(100vw,calc((100dvh-4rem)*9/16),420px)]"
          style={{ aspectRatio: "9 / 16" }}
        >
          {/* 白ポスト枠：親に対する割合固定（文字量でサイズは変わらない） */}
          <div className="absolute inset-[5.5%] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-4">
              {displayParagraphs.length === 0 ? (
                paragraphs.length === 0 ? (
                  <p className="text-[15px] leading-relaxed text-zinc-300">
                    （本文がここに表示されます）
                  </p>
                ) : (
                  <div className="min-h-[40px]" aria-hidden />
                )
              ) : (
                <div className="space-y-3">
                  {displayParagraphs.map((para, i) => (
                    <p
                      key={`${i}-${para.slice(0, 24)}`}
                      className="text-left text-[15px] leading-relaxed text-[#0f1419]"
                    >
                      <ParaBody text={para} />
                    </p>
                  ))}
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

      {/* 編集パネル */}
      <section className="order-2 flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-zinc-800 bg-zinc-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:order-1 lg:max-w-md lg:flex-none lg:border-t-0 lg:border-r">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-base font-semibold tracking-tight text-white">
            TikTok用 · X風テキスト
          </h1>
          <Link
            href="/"
            className="shrink-0 text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            履修サポートへ
          </Link>
        </div>

        <p className="mb-2 text-[11px] leading-relaxed text-zinc-500">
          下の黒枠が <strong className="text-zinc-400">9:16</strong>
          です。この範囲を画面録画してください。白いポストの外枠サイズは固定で、長文は枠内スクロールになります。
        </p>

        <label className="text-xs font-medium text-zinc-400">本文</label>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          disabled={playing}
          className="mt-1 min-h-[160px] w-full flex-1 resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 disabled:opacity-50 lg:min-h-[200px] lg:flex-none"
          spellCheck={false}
        />

        <div className="mt-3 grid grid-cols-3 gap-2">
          <label className="text-[10px]">
            <span className="text-zinc-500">時刻</span>
            <input
              value={metaTime}
              onChange={(e) => setMetaTime(e.target.value)}
              className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
            />
          </label>
          <label className="text-[10px]">
            <span className="text-zinc-500">日付</span>
            <input
              value={metaDate}
              onChange={(e) => setMetaDate(e.target.value)}
              className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
            />
          </label>
          <label className="text-[10px]">
            <span className="text-zinc-500">表示</span>
            <input
              value={metaViews}
              onChange={(e) => setMetaViews(e.target.value)}
              className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
          <button
            type="button"
            onClick={startPlayback}
            disabled={playing || paragraphs.length === 0}
            className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-zinc-900 disabled:opacity-40 sm:text-sm"
          >
            再生（積み上げ）
          </button>
          <button
            type="button"
            onClick={stopPlayback}
            className="rounded-lg border border-zinc-600 px-3 py-2 text-xs text-zinc-200 sm:text-sm"
          >
            停止 · 全文表示
          </button>
          <label className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-500 sm:text-xs">
            間隔
            <input
              type="range"
              min={300}
              max={2800}
              step={100}
              value={stepMs}
              onChange={(e) => setStepMs(Number(e.target.value))}
              disabled={playing}
              className="w-20 sm:w-28"
            />
            <span className="w-10 tabular-nums text-zinc-400">
              {(stepMs / 1000).toFixed(1)}s
            </span>
          </label>
        </div>

        <p className="mt-2 text-[10px] text-zinc-600">
          空行で段落分け。再生時は段落が順に増えるだけ（アニメーションなし）。
        </p>
      </section>
    </div>
  );
}
