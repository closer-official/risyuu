/** 既定の AdSense パブリッシャー ID（Vercel の NEXT_PUBLIC_ADSENSE_CLIENT_ID で上書き可） */
export const DEFAULT_ADSENSE_CLIENT_ID = "ca-pub-4502709909190086";

export function getAdsenseClientId(): string {
  return (
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ||
    DEFAULT_ADSENSE_CLIENT_ID
  );
}
