/** 大学の学術メール想定（*.ac.jp）。運用で許可ドメインを増やす場合はここを拡張。 */
export function isStudentEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 0) return false;
  const host = e.slice(at + 1);
  return host === "ac.jp" || host.endsWith(".ac.jp");
}
