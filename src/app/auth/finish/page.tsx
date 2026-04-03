"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

function emailLinkStorageKey(href: string) {
  return `risyutoroku_emailLinkOk:${href.length > 200 ? href.slice(0, 200) : href}`;
}

export default function AuthFinishPage() {
  const router = useRouter();
  const { firebaseReady, loading: authLoading, completeEmailLinkSignIn } = useAuth();
  const [status, setStatus] = useState<"working" | "ok" | "err">("working");
  const [message, setMessage] = useState("ログインを完了しています…");

  useEffect(() => {
    if (!firebaseReady) {
      setStatus("err");
      setMessage("Firebase が未設定です。");
      return;
    }
    if (authLoading) return;
    if (typeof window === "undefined") return;

    const href = window.location.href;
    const sk = emailLinkStorageKey(href);
    if (sessionStorage.getItem(sk) === "1") {
      setStatus("ok");
      setMessage("すでに連携済みです。トップへ移動します。");
      router.replace("/");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await completeEmailLinkSignIn();
        if (cancelled) return;
        sessionStorage.setItem(sk, "1");
        setStatus("ok");
        setMessage("学生メールとの連携が完了しました。");
        router.replace("/");
      } catch (e) {
        if (cancelled) return;
        setStatus("err");
        setMessage(e instanceof Error ? e.message : "ログインに失敗しました");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [firebaseReady, authLoading, completeEmailLinkSignIn, router]);

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">メールリンク認証</h1>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      {status !== "working" && (
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-zinc-800 underline dark:text-zinc-200">
          トップへ戻る
        </Link>
      )}
    </main>
  );
}
