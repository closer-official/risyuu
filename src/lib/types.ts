/** 受講時期（大学ごとに表記は異なるため拡張可能） */
export type TermKind = "zenki" | "kouki" | "tsuunen" | "other";

export type DocumentKind = "handbook" | "syllabus" | "transcript";

export interface Cohort {
  id: string;
  university: string;
  faculty: string;
  department: string;
  /** 入学年度（例: 2025年入学なら 2025） */
  enrollmentYear: number;
  createdAt: string;
}

export interface StoredDocument {
  id: string;
  cohortId: string;
  kind: DocumentKind;
  /** 保存ファイル名（ディスク上） */
  storedFileName: string;
  originalFileName: string;
  /** シラバス用の任意ラベル */
  courseCode?: string;
  courseTitle?: string;
  termTag?: TermKind;
  uploadedAt: string;
  /** テキスト抽出済みなら true（同一コホート内キーワード検索に利用） */
  searchTextReady?: boolean;
  searchTextError?: string;
}

export interface CohortInput {
  university: string;
  faculty: string;
  department: string;
  enrollmentYear: number;
}
