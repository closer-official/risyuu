import Script from "next/script";
import { getAdsenseClientId } from "@/lib/adsenseClientId";

/** AdSense（adsbygoogle.js）。環境変数があればそちらを優先 */
export function AdSenseScript() {
  const id = getAdsenseClientId();
  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(id)}`}
      crossOrigin="anonymous"
    />
  );
}
