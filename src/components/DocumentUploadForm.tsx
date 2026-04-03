"use client";

import { useState } from "react";

const termOptions = [
  { value: "", label: "（未指定）" },
  { value: "zenki", label: "前期" },
  { value: "kouki", label: "後期" },
  { value: "tsuunen", label: "通年" },
  { value: "other", label: "その他" },
];

export function DocumentUploadForm({
  cohortId,
  onUploaded,
}: {
  cohortId: string;
  onUploaded: () => void;
}) {
  const [kind, setKind] = useState<"handbook" | "syllabus" | "transcript">("handbook");
  const [file, setFile] = useState<File | null>(null);
  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [termTag, setTermTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!file) {
      setMessage("PDFを選択してください");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      if (courseCode) fd.append("courseCode", courseCode);
      if (courseTitle) fd.append("courseTitle", courseTitle);
      if (termTag) fd.append("termTag", termTag);

      const res = await fetch(`/api/cohorts/${cohortId}/documents`, {
        method: "POST",
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) {
        setMessage(j.error ?? "アップロードに失敗しました");
        return;
      }
      setFile(null);
      setCourseCode("");
      setCourseTitle("");
      setTermTag("");
      setMessage("アップロードしました");
      onUploaded();
    } catch {
      setMessage("通信エラー");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        PDFをアップロード
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        同じ大学・学部・学科・入学年度のコホートにのみ保存されます。他年度・他大学の要覧は混ざりません。
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          種別
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as "handbook" | "syllabus" | "transcript")
            }
          >
            <option value="handbook">学生要覧</option>
            <option value="syllabus">シラバス</option>
            <option value="transcript">成績表・単位記録（PDF）</option>
          </select>
        </label>

        {kind !== "transcript" && (
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            開講時期タグ（任意）
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              value={termTag}
              onChange={(e) => setTermTag(e.target.value)}
            >
              {termOptions.map((o) => (
                <option key={o.value || "empty"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {kind === "syllabus" && (
          <>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              科目コード（任意）
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              科目名
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="シラバスに対応する科目名"
              />
            </label>
          </>
        )}

        {kind === "transcript" && (
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
            表示名（任意）
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="例: 2025年度春学期 成績通知"
            />
          </label>
        )}

        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
          PDFファイル
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="mt-1 block w-full text-sm text-zinc-600 dark:text-zinc-400"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {message && (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{message}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {busy ? "送信中…" : "アップロード"}
      </button>
    </form>
  );
}
