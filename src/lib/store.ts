import { promises as fs } from "fs";
import path from "path";
import { normalizeKeyPart } from "./cohortNormalize";
import type { Cohort, CohortInput, StoredDocument } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app-db.json");
const UPLOAD_ROOT = path.join(DATA_DIR, "uploads");
const TEXT_CACHE_DIR = path.join(DATA_DIR, "text-cache");

interface DbFile {
  cohorts: Cohort[];
  documents: StoredDocument[];
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  await fs.mkdir(TEXT_CACHE_DIR, { recursive: true });
}

async function readDb(): Promise<DbFile> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as DbFile;
    return {
      cohorts: parsed.cohorts ?? [],
      documents: parsed.documents ?? [],
    };
  } catch {
    return { cohorts: [], documents: [] };
  }
}

async function writeDb(db: DbFile) {
  await ensureDataDir();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function cohortMatchKey(input: CohortInput) {
  return [
    normalizeKeyPart(input.university),
    normalizeKeyPart(input.faculty),
    normalizeKeyPart(input.department),
    String(input.enrollmentYear),
  ].join("\u0000");
}

export async function findOrCreateCohort(input: CohortInput): Promise<Cohort> {
  const uni = normalizeKeyPart(input.university);
  const fac = normalizeKeyPart(input.faculty);
  const dep = normalizeKeyPart(input.department);
  const year = Math.floor(Number(input.enrollmentYear));
  if (!uni || !fac || !dep || !Number.isFinite(year) || year < 1900 || year > 2100) {
    throw new Error("INVALID_COHORT_INPUT");
  }

  const db = await readDb();
  const existing = db.cohorts.find(
    (c) =>
      normalizeKeyPart(c.university) === uni &&
      normalizeKeyPart(c.faculty) === fac &&
      normalizeKeyPart(c.department) === dep &&
      c.enrollmentYear === year
  );
  if (existing) return existing;

  const cohort: Cohort = {
    id: crypto.randomUUID(),
    university: uni,
    faculty: fac,
    department: dep,
    enrollmentYear: year,
    createdAt: new Date().toISOString(),
  };
  db.cohorts.push(cohort);
  await writeDb(db);
  return cohort;
}

export async function getCohortById(id: string): Promise<Cohort | null> {
  const db = await readDb();
  return db.cohorts.find((c) => c.id === id) ?? null;
}

/** 過去コホートから大学・学部・学科の組み合わせ一覧（重複除去・表示用の正規化済み文字列） */
export async function listCohortPlaceTriples(): Promise<
  { university: string; faculty: string; department: string }[]
> {
  const db = await readDb();
  const seen = new Set<string>();
  const out: { university: string; faculty: string; department: string }[] = [];
  for (const c of db.cohorts) {
    const uni = normalizeKeyPart(c.university);
    const fac = normalizeKeyPart(c.faculty);
    const dep = normalizeKeyPart(c.department);
    if (!uni || !fac || !dep) continue;
    const key = `${uni}\0${fac}\0${dep}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      university: c.university,
      faculty: c.faculty,
      department: c.department,
    });
  }
  out.sort((a, b) => {
    const u = a.university.localeCompare(b.university, "ja");
    if (u !== 0) return u;
    const f = a.faculty.localeCompare(b.faculty, "ja");
    if (f !== 0) return f;
    return a.department.localeCompare(b.department, "ja");
  });
  return out;
}

export async function listDocumentsForCohort(cohortId: string): Promise<StoredDocument[]> {
  const db = await readDb();
  return db.documents.filter((d) => d.cohortId === cohortId);
}

export async function addDocument(doc: StoredDocument) {
  const db = await readDb();
  db.documents.push(doc);
  await writeDb(db);
}

export async function updateDocumentSearchFields(
  id: string,
  fields: { searchTextReady: boolean; searchTextError?: string }
) {
  const db = await readDb();
  const i = db.documents.findIndex((d) => d.id === id);
  if (i === -1) return false;
  const next: StoredDocument = { ...db.documents[i], searchTextReady: fields.searchTextReady };
  if (fields.searchTextError !== undefined) {
    next.searchTextError = fields.searchTextError;
  } else {
    delete next.searchTextError;
  }
  db.documents[i] = next;
  await writeDb(db);
  return true;
}

export function textCachePath(docId: string) {
  return path.join(TEXT_CACHE_DIR, `${docId}.txt`);
}

export async function saveSearchTextFile(docId: string, text: string) {
  await ensureDataDir();
  await fs.writeFile(textCachePath(docId), text, "utf-8");
}

export async function readSearchTextFile(docId: string): Promise<string | null> {
  try {
    return await fs.readFile(textCachePath(docId), "utf-8");
  } catch {
    return null;
  }
}

export async function getDocumentById(id: string): Promise<StoredDocument | null> {
  const db = await readDb();
  return db.documents.find((d) => d.id === id) ?? null;
}

export function cohortUploadDir(cohortId: string) {
  return path.join(UPLOAD_ROOT, cohortId);
}

export async function savePdfToDisk(
  cohortId: string,
  docId: string,
  buffer: Buffer
): Promise<string> {
  const dir = cohortUploadDir(cohortId);
  await fs.mkdir(dir, { recursive: true });
  const storedFileName = `${docId}.pdf`;
  const full = path.join(dir, storedFileName);
  await fs.writeFile(full, buffer);
  return storedFileName;
}

export function absoluteDocPath(cohortId: string, storedFileName: string) {
  return path.join(cohortUploadDir(cohortId), storedFileName);
}
