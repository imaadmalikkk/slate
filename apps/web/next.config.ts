import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["defuddle", "jsdom", "dompurify"],
};

export default nextConfig;
