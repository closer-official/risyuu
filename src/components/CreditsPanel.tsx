"use client";

import { useEffect, useState } from "react";

const storageKey = (cohortId: string) => `risyutoroku_credits_v1_${cohortId}`;

export interface CreditsState {
  earnedTotal: string;
  memo: string;
}

export function CreditsPanel({ cohortId }: { cohortId: string }) {
  const [earnedTotal, setEarnedTotal] = useState("");
  const [memo, setMemo] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(cohortId));
      if (raw) {
        const j = JSON.parse(raw) as CreditsState;
        setEarnedTotal(j.earnedTotal ?? "");
        setMemo(j.memo ?? "");
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [cohortId]);

  useEffect(() => {
    if (!loaded) return;
    const payload: CreditsState = { earnedTotal, memo };
    localStorage.setItem(storageKey(cohortId), JSON.stringify(payload));
  }, [cohortId, earnedTotal, memo, loaded]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        取得単位（手入力・任意）
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        合計単位数や内訳をメモできます（この端末のブラウザにのみ保存）。成績表は下の一覧から
        <strong className="font-medium"> PDF アップロード</strong>
        でも登録できます。学生要覧と突き合わせてご利用ください。
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          取得済み単位（合計）
          <input
            type="text"
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="例: 28"
            value={earnedTotal}
            onChange={(e) => setEarnedTotal(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
          メモ（必修・選択の内訳など）
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="要覧の表を見ながら自由にメモ"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
