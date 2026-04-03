/** コホート照合用（大学・学部・学科の表記ゆれ軽減） */
export function normalizeKeyPart(s: string) {
  return s.trim().replace(/\s+/g, " ");
}
