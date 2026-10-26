import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // App Router API Catch-all handles /api/* routing directly with error handling
};

export default nextConfig;
