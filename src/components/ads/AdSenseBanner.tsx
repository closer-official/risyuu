"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function getClientId(): string {
  return process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() || "";
}

function getSlot(): string {
  return process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT?.trim() || "";
}

type Props = {
  className?: string;
};

/**
 * ディスプレイ広告（横長バナー想定・レスポンシブ）。
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID（ca-pub-…）と NEXT_PUBLIC_ADSENSE_BANNER_SLOT が両方あるときだけ表示。
 */
export function AdSenseBanner({ className }: Props) {
  const [mounted, setMounted] = useState(false);
  const pushedRef = useRef(false);

  const clientId = getClientId();
  const slot = getSlot();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !clientId || !slot || pushedRef.current) return;
    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      pushedRef.current = false;
    }
  }, [mounted, clientId, slot]);

  if (!mounted || !clientId || !slot) return null;

  return (
    <aside
      className={className}
      aria-label="スポンサー広告"
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", textAlign: "center" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
