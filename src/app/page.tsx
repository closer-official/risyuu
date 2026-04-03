"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdSenseBanner } from "@/components/ads/AdSenseBanner";
import { AuthStatusPanel } from "@/components/auth/AuthStatusPanel";
import { normalizeKeyPart } from "@/lib/cohortNormalize";

type PlaceTriple = { university: string; faculty: string; department: string };

export default function HomePage() {
  const router = useRouter();
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [enrollmentYear, setEnrollmentYear] = useState("");
  const [grade, setGrade] = useState("1");
  const [term, setTerm] = useState("zenki");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeTriples, setPlaceTriples] = useState<PlaceTriple[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cohorts/suggestions");
        const j = (await res.json()) as { triples?: PlaceTriple[] };
        if (!cancelled && Array.isArray(j.triples)) setPlaceTriples(j.triples);
      } catch {
        /* 候補なしのまま入力可能 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const universitySuggestions = useMemo(() => {
    const s = new Set<string>();
    for (const t of placeTriples) s.add(t.university);
    return [...s].sort((a, b) => a.localeCompare(b, "ja"));
  }, [placeTriples]);

  const facultySuggestions = useMemo(() => {
    if (!university.trim()) return [];
    const nu = normalizeKeyPart(university);
    const s = new Set<string>();
    for (const t of placeTriples) {
      if (normalizeKeyPart(t.university) === nu) s.add(t.faculty);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "ja"));
  }, [placeTriples, university]);

  const departmentSuggestions = useMemo(() => {
    if (!university.trim() || !faculty.trim()) return [];
    const nu = normalizeKeyPart(university);
    const nf = normalizeKeyPart(faculty);
    const s = new Set<string>();
    for (const t of placeTriples) {
      if (
        normalizeKeyPart(t.university) === nu &&
        normalizeKeyPart(t.faculty) === nf
      ) {
        s.add(t.department);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b, "ja"));
  }, [placeTriples, university, faculty]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          university,
          faculty,
          department,
          enrollmentYear: Number(enrollmentYear),
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "エラーが発生しました");
        return;
      }
      const id = j.cohort.id as string;
      const q = new URLSearchParams({ grade, term });
      router.push(`/workspace/${id}?${q.toString()}`);
    } catch {
      setError("通信に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  const yearNow = new Date().getFullYear();

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          履修登録サポート
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          大学・学部・学科・入学年度が一致するグループ（コホート）ごとに、学生要覧とシラバス（PDF）を共有・参照します。
          AIや外部データは使いません。
        </p>

        <div className="mt-5">
          <AuthStatusPanel />
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            誰かが一度でも登録した大学・学部・学科は、下矢印で候補から選べます（新規の正式名称でも入力可）。
          </p>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            大学名
            <input
              required
              name="university"
              autoComplete="organization"
              list="cohort-suggest-university"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="正式名称で入力"
            />
            <datalist id="cohort-suggest-university">
              {universitySuggestions.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            学部
            <input
              required
              name="faculty"
              list="cohort-suggest-faculty"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              placeholder={
                university.trim()
                  ? facultySuggestions.length
                    ? "候補から選ぶか入力"
                    : "該当コホートがなければそのまま入力"
                  : "先に大学名を入力すると候補が出ます"
              }
            />
            <datalist id="cohort-suggest-faculty">
              {facultySuggestions.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            学科・専攻など
            <input
              required
              name="department"
              list="cohort-suggest-department"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={
                university.trim() && faculty.trim()
                  ? departmentSuggestions.length
                    ? "候補から選ぶか入力"
                    : "該当コホートがなければそのまま入力"
                  : "大学・学部を入れると候補が出ます"
              }
            />
            <datalist id="cohort-suggest-department">
              {departmentSuggestions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            入学年度
            <input
              required
              type="number"
              min={yearNow - 15}
              max={yearNow + 1}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              value={enrollmentYear}
              onChange={(e) => setEnrollmentYear(e.target.value)}
              placeholder={`例: ${yearNow}`}
            />
          </label>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            現在の学年
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={String(n)}>
                  {n}年
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            受講・履修登録の時期
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            >
              <option value="zenki">前期</option>
              <option value="kouki">後期</option>
              <option value="tsuunen">通年</option>
              <option value="other">その他</option>
            </select>
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {busy ? "処理中…" : "この条件で進む"}
          </button>
        </form>
      </div>
      <AdSenseBanner className="mx-auto mt-8 max-w-lg overflow-hidden" />
      <p className="mt-6 text-center text-xs text-zinc-500">
        入学年度が異なると学生要覧の内容も異なるため、別コホートとして完全に分離しています。
      </p>
    </main>
  );
}
