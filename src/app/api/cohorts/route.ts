import { NextResponse } from "next/server";
import { findOrCreateCohort } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const university = String(body.university ?? "");
    const faculty = String(body.faculty ?? "");
    const department = String(body.department ?? "");
    const enrollmentYear = Number(body.enrollmentYear);

    const cohort = await findOrCreateCohort({
      university,
      faculty,
      department,
      enrollmentYear,
    });
    return NextResponse.json({ cohort });
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_COHORT_INPUT") {
      return NextResponse.json({ error: "入力が不正です。" }, { status: 400 });
    }
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
