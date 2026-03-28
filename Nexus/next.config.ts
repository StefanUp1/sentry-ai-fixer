import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PPR is enabled via Cache Components (replaces experimental.ppr in recent Next.js)
  cacheComponents: true,
};

export default nextConfig;
