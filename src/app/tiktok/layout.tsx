import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TikTok用 X風エディタ",
  description: "9:16 縦型・X風ポストのテキスト積み上げプレビュー",
};

export default function TikTokLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
