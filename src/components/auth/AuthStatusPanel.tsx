"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { isStudentEmail } from "@/lib/studentEmail";

export function AuthStatusPanel() {
  const { user, loading, firebaseReady, isVerifiedStudent, sendStudentEmailLink } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await sendStudentEmailLink(email);
      setMsg("ログイン用リンクをメールで送信しました。届いたリンクを同じブラウザで開いてください。");
      setEmail("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  if (!firebaseReady) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
        Firebase が未設定です。Firebase で Web アプリを作成し、本番ホストの環境変数（例: Vercel の{" "}
        <span className="font-medium">Settings → Environment Variables</span>）に{" "}
        <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">NEXT_PUBLIC_FIREBASE_*</code>
        と <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">NEXT_PUBLIC_APP_URL</code>
        を設定し、再デプロイしてください。
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-xs text-zinc-500 dark:text-zinc-400">アカウントを準備しています…</div>
    );
  }

  if (isVerifiedStudent && user?.email) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
        学生メール連携済み: <span className="font-mono">{user.email}</span>
        <p className="mt-1 text-xs opacity-90">
          今後、口コミ・共有資料の提出・AI などはこのアカウントに紐づけられます（実装は順次）。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/60">
      <p className="text-zinc-700 dark:text-zinc-300">
        時間割などはこのまま利用できます。口コミ・資料共有・AI 用に{" "}
        <strong className="font-medium">学術メール（〜.ac.jp）</strong>で本人確認してください。
      </p>
      {user?.isAnonymous && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          現在: 匿名 ID（端末に紐づく）でログイン中。メール連携で同じ UID に学生メールが付きます。
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          学術メール
          <input
            type="email"
            autoComplete="email"
            className="mt-0.5 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="xxxx@〜.ac.jp"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !isStudentEmail(email)}
          className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "送信中…" : "ログインリンクを送る"}
        </button>
      </form>
      {msg && <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{msg}</p>}
    </div>
  );
}
