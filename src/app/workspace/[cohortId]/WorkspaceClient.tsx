"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Cohort, StoredDocument } from "@/lib/types";
import { CreditsPanel } from "@/components/CreditsPanel";
import { DocumentList } from "@/components/DocumentList";
import { DocumentUploadForm } from "@/components/DocumentUploadForm";
import { PdfSearchPanel } from "@/components/PdfSearchPanel";
import { DataOnlyChatPanel } from "@/components/DataOnlyChatPanel";
import { AdSenseBanner } from "@/components/ads/AdSenseBanner";

type TermQuery = "zenki" | "kouki" | "tsuunen" | "other";

function isFreshmanFirstTerm(grade: number, term: TermQuery) {
  return grade === 1 && term === "zenki";
}

export function WorkspaceClient({
  cohort,
  grade,
  term,
}: {
  cohort: Cohort;
  grade: number;
  term: TermQuery;
}) {
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [forceShowCredits, setForceShowCredits] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch(`/api/cohorts/${cohort.id}/documents`);
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error ?? "読み込み失敗");
        return;
      }
      setDocs(j.documents as StoredDocument[]);
    } catch {
      setErr("通信エラー");
    }
  }, [cohort.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handbooks = useMemo(() => docs.filter((d) => d.kind === "handbook"), [docs]);
  const syllabi = useMemo(() => docs.filter((d) => d.kind === "syllabus"), [docs]);
  const transcripts = useMemo(() => docs.filter((d) => d.kind === "transcript"), [docs]);
  const defaultCreditsVisible = !isFreshmanFirstTerm(grade, term);
  const showCredits = defaultCreditsVisible || forceShowCredits;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          ← 条件を変えて選び直す
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          履修サポート（同一コホート専用）
        </h1>
        <dl className="grid gap-1 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
          <div>
            <dt className="inline text-zinc-500">大学：</dt>
            <dd className="inline">{cohort.university}</dd>
          </div>
          <div>
            <dt className="inline text-zinc-500">学部：</dt>
            <dd className="inline">{cohort.faculty}</dd>
          </div>
          <div>
            <dt className="inline text-zinc-500">学科：</dt>
            <dd className="inline">{cohort.department}</dd>
          </div>
          <div>
            <dt className="inline text-zinc-500">入学年度：</dt>
            <dd className="inline">{cohort.enrollmentYear}年</dd>
          </div>
          <div>
            <dt className="inline text-zinc-500">学年：</dt>
            <dd className="inline">{grade}</dd>
          </div>
          <div>
            <dt className="inline text-zinc-500">受講時期：</dt>
            <dd className="inline">
              {term === "zenki"
                ? "前期"
                : term === "kouki"
                  ? "後期"
                  : term === "tsuunen"
                    ? "通年"
                    : "その他"}
            </dd>
          </div>
        </dl>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          外部サイトや他大学・他入学年度のデータは参照しません。この画面に表示されるPDFは、入力した条件と一致するコホートにアップロードされたものだけです。
        </p>
      </header>

      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}

      {!defaultCreditsVisible && (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          <p>
            <strong className="font-semibold">1年生前学期（未履修想定）</strong>
            のモードです。学生要覧とシラバスを開いて履修を検討してください。取得単位の入力欄は既定では非表示です。
          </p>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={forceShowCredits}
              onChange={(e) => setForceShowCredits(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-400"
            />
            <span>すでに単位を取得している／入力したい場合は取得単位欄を表示する</span>
          </label>
        </div>
      )}

      {showCredits && <CreditsPanel cohortId={cohort.id} />}

      {(showCredits || transcripts.length > 0) && (
        <DocumentList
          title="成績表・単位の記録（PDF）"
          documents={transcripts}
          emptyText="成績表や単位証明のPDFをアップロードすると、ここに表示されます。下のフォームで「成績表・単位記録」を選んでください。"
          cohortId={cohort.id}
          onDocumentsChange={() => void load()}
        />
      )}

      <PdfSearchPanel cohortId={cohort.id} />

      <DataOnlyChatPanel cohortId={cohort.id} />

      <DocumentList
        title="学生要覧（この入学年度のコホート）"
        documents={handbooks}
        emptyText="まだ要覧がアップロードされていません。下のフォームからPDFを追加するか、同じ入学年度の仲間に共有してもらってください。"
        cohortId={cohort.id}
        onDocumentsChange={() => void load()}
      />

      <DocumentList
        title="シラバス一覧（コホートに登録された分）"
        documents={syllabi}
        emptyText="履修候補のシラバスPDFをアップロードすると、ここに一覧表示されます。"
        cohortId={cohort.id}
        onDocumentsChange={() => void load()}
      />

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-700 dark:bg-zinc-900/50">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">履修の進め方（ルールベース）</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>学生要覧PDFで卒業要件・必修・選択の区分と単位数を確認する。</li>
          <li>履修登録対象の各科目について、対応するシラバスPDFを開いて内容・評価方法を確認する。</li>
          {showCredits && (
            <li>
              すでに修得した単位は「取得単位」の手入力と、必要なら成績表PDFの双方で整理し、要覧の残り必要単位と突き合わせる。
            </li>
          )}
          <li>
            キーワード検索または「データ照会チャット」で、要覧・シラバス・成績表PDFから文字が取れている範囲だけを横断照合できる（AI・外部データ不使用）。
          </li>
          <li>大学の公式履修登録システムでの操作は、必ず大学の案内に従って行う。</li>
        </ol>
      </section>

      <AdSenseBanner className="overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-2 dark:border-zinc-700/80 dark:bg-zinc-900/40" />

      <DocumentUploadForm cohortId={cohort.id} onUploaded={() => void load()} />
    </div>
  );
}
