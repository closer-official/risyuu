import Script from "next/script";

function clientId(): string | undefined {
  return process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() || undefined;
}

/** 広告クライアント ID があるときだけ adsbygoogle.js を 1 回読み込む */
export function AdSenseScript() {
  const id = clientId();
  if (!id) return null;
  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(id)}`}
      crossOrigin="anonymous"
    />
  );
}
