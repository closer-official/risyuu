import { notFound } from "next/navigation";
import { getCohortById } from "@/lib/store";
import { WorkspaceClient } from "./WorkspaceClient";

type TermQuery = "zenki" | "kouki" | "tsuunen" | "other";

function parseTerm(v: string | undefined): TermQuery {
  if (v === "kouki" || v === "tsuunen" || v === "other") return v;
  return "zenki";
}

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ cohortId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { cohortId } = await params;
  const sp = await searchParams;
  const cohort = await getCohortById(cohortId);
  if (!cohort) notFound();

  const gRaw = sp.grade;
  const gStr = Array.isArray(gRaw) ? gRaw[0] : gRaw;
  const grade = Math.min(6, Math.max(1, Math.floor(Number(gStr ?? "1")) || 1));

  const tRaw = sp.term;
  const tStr = Array.isArray(tRaw) ? tRaw[0] : tRaw;
  const term = parseTerm(tStr);

  return <WorkspaceClient cohort={cohort} grade={grade} term={term} />;
}
