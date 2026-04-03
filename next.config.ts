import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdf-parse-legacy", "pdfjs-dist"],
};

export default nextConfig;
